-- ---------------------------------------------------------------------------
-- CICLO 3 · FASE 1 — AS TRAVAS EXECUTADAS, não avaliadas.
-- ---------------------------------------------------------------------------
--
-- ⚠  RODE O ARQUIVO INTEIRO. O `begin;` da primeira linha não é decoração.
--
--    Sem ele, cada statement fecha sozinho: o primeiro bloco `DO` **commitaria**
--    os dois lançamentos do controle positivo (~100 ⚡ de verdade, num livro
--    append-only onde a correção é um estorno), e a exceção-relatório do fim
--    chegaria tarde demais para desfazê-los.
--
--    Rodando o arquivo inteiro, nada disso é possível — e há um segundo cinto:
--    a tabela temporária `resultado` nasce aqui em cima, então um bloco `DO`
--    executado sozinho estoura no primeiro `insert into resultado` com
--    `42P01 undefined_table` e o `DO` inteiro volta atrás, porque um `DO` é
--    **um** statement.
--
-- ---------------------------------------------------------------------------
-- POR QUE ESTE ARQUIVO ESTÁ NO REPOSITÓRIO, E OS HARNESSES DE FASE NÃO
-- ---------------------------------------------------------------------------
--
-- Ele não é evidência — evidência é o retrato de uma rodada, e essa mora em
-- `scratchpad/evidencias/`. **Ele é prova reexecutável**, e a diferença decide
-- onde cada um vive:
--
--   * um harness de fase responde "isto funcionou naquele dia?" — e depois do
--     dia ele não responde mais nada. Fica no scratchpad, como o
--     `fase4-ramos.ts` do Ciclo 2;
--   * este responde **"as travas ainda recusam?"**, e essa pergunta volta toda
--     vez que alguém encostar em `record_generation`, em
--     `submit_video_generation` ou nas duas chaves compostas. As migrations que
--     ele guarda estão versionadas; ele fora do repositório seria a constraint
--     sem o teste que prova que ela fecha.
--
-- Não carrega segredo, não carrega URL assinada e não nomeia dado de ninguém:
-- pega o primeiro projeto, a primeira cena e o primeiro asset que encontrar.
--
-- Roda **à mão**, no SQL Editor ou no psql. Não é pgTAP e não é executado por
-- `supabase test db` — por isso mora em `supabase/travas/` e não em
-- `supabase/tests/`, que implicaria um contrato de ferramenta que ele não tem.
--
-- A conferência read-only já provou que as colunas, as constraints e os índices
-- existem com a definição exata, e que o corpo das três funções no banco bate
-- por md5 com o arquivo da migration. Falta a parte que só um INSERT (e um
-- DELETE) provam: **que elas recusam.**
--
--     Trava que nunca reprovou de verdade ainda não é trava.  (regra do Jorge)
--
-- Roda contra o estado FINAL — as duas migrations aplicadas:
--   20260828143000_storyboard_machine_scene_link.sql
--   20260828160000_aprovacao_nao_some_em_silencio.sql   (NO ACTION)
--
-- ---------------------------------------------------------------------------
-- COMO RODAR, E ONDE O RELATÓRIO APARECE
-- ---------------------------------------------------------------------------
--
-- Cole tudo de uma vez no SQL Editor do painel do Supabase e rode.
--
-- **O relatório aparece DUAS vezes, de propósito**, porque um editor que mostra
-- só o último resultado deixaria a tabela invisível atrás do `rollback`:
--
--   1. como TABELA, no resultado do `select` — é o formato do script do Ciclo 2,
--      que rodou assim e foi lido assim;
--   2. como MENSAGEM DE ERRO, no fim — e **esse "erro" é o relatório**. É a
--      doutrina de 07/08/2026: *a exceção é o relatório e é também o que desfaz
--      os dados de teste*, e é o formato que roda igual no painel e no psql.
--
-- Se aparecer um erro vermelho no fim com "RELATORIO DAS TRAVAS" dentro, **é
-- assim que tem de ser**. Ele é o que garante que nada foi gravado, mesmo que
-- alguém rode só um pedaço do script.
--
-- Está inteiro dentro de BEGIN … ROLLBACK: nenhum modelo é chamado, nenhum
-- Spark sai do saldo de verdade, e os dois lançamentos do controle positivo
-- existem por milissegundos dentro da transação.

begin;

create temp table resultado (
  n          integer,
  trava      text,
  tentei     text,
  aconteceu  text,
  esperado   text,
  veredito   text
) on commit drop;

do $$
declare
  v_user           uuid;
  v_project        uuid;
  v_project_2      uuid;
  v_cena           uuid;
  v_cena_titulo    text;
  v_cena_ordem     integer;
  v_asset          uuid;
  v_asset_tmp      uuid;
  v_modelo_img     uuid;
  v_tamanho        text;
  v_modelo_vid     uuid;
  v_dur            integer;
  v_res            text;
  v_user_2         uuid;
  v_proj_2         uuid;
  v_sb_2           uuid;
  v_cena_2         uuid;
  v_asset_2        uuid;
  v_tem_user_2     boolean := false;
  v_proj_tmp       uuid;
  v_sb_tmp         uuid;
  v_cena_tmp       uuid;
  v_ger            public.generations;
  v_gid            uuid;
  v_desc           text;
  v_sobrou         integer;
  v_sparks         integer;
  v_scene_depois   uuid;
  v_a              integer;
  v_b              integer;
begin
  -- =========================================================================
  -- Cenário: tudo real, nada inventado além do que a transação desfaz
  -- =========================================================================
  select p.id, p.user_id into v_project, v_user
    from public.projects p order by p.created_at limit 1;

  select s.id, s.ordem, sb.titulo into v_cena, v_cena_ordem, v_cena_titulo
    from public.storyboard_scenes s
    join public.storyboards sb on sb.id = s.storyboard_id
   where sb.project_id = v_project
   order by s.ordem limit 1;

  select a.id into v_asset
    from public.assets a where a.user_id = v_user and a.kind = 'image' limit 1;

  select ip.model_id, ip.image_size into v_modelo_img, v_tamanho
    from public.ai_model_image_prices ip
    join public.ai_models m on m.id = ip.model_id
    join public.ai_providers pr on pr.id = m.provider_id
   where m.enabled and pr.enabled and 'image_gen' = any (m.capabilities)
   order by ip.sparks limit 1;

  select vp.model_id, vp.duration_seconds, vp.resolution
    into v_modelo_vid, v_dur, v_res
    from public.ai_model_video_prices vp
    join public.ai_models m on m.id = vp.model_id
   where m.enabled limit 1;

  if v_project is null or v_cena is null or v_asset is null or v_modelo_img is null then
    raise exception 'faltou cenário: projeto=% cena=% asset=% modelo=%',
      v_project, v_cena, v_asset, v_modelo_img;
  end if;

  -- auth.uid() lê request.jwt.claims. Sem isto, record_generation recusaria com
  -- insufficient_privilege e nada abaixo teria sido testado de verdade.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_user::text)::text, true);

  -- Um SEGUNDO projeto do MESMO dono, para o caso "cena do projeto errado".
  insert into public.projects (user_id, name)
  values (v_user, 'projeto-de-teste-c3-' || gen_random_uuid()::text)
  returning id into v_project_2;

  -- Um SEGUNDO dono, para os casos de cruzamento e para a cascata do diamante.
  -- Guardado: se o schema do auth não deixar, os testes que dependem dele viram
  -- "nao exercitado" COM NOME — nunca OK por ausência.
  begin
    v_user_2 := gen_random_uuid();
    insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at)
    values (v_user_2, 'authenticated', 'authenticated',
            'teste-c3-' || v_user_2::text || '@exemplo.invalido',
            '{}'::jsonb, '{}'::jsonb, now(), now());
    v_tem_user_2 := true;
  exception when others then
    v_tem_user_2 := false;
  end;

  -- =========================================================================
  -- 1. generations.scene_id apontando para cena que NÃO EXISTE
  -- =========================================================================
  begin
    insert into public.generations
      (user_id, model_id, provider, model, media_kind, status, project_id, scene_id)
    values (v_user, v_modelo_img, 'x', 'x', 'image', 'failed', v_project, gen_random_uuid());
    insert into resultado values (1, 'generations_scene_belongs_to_user',
      'geração apontando para cena inexistente', 'PASSOU', 'recusar', 'FALHA');
  exception when foreign_key_violation then
    insert into resultado values (1, 'generations_scene_belongs_to_user',
      'geração apontando para cena inexistente', 'recusou (23503)', 'recusar', 'OK');
  end;

  -- =========================================================================
  -- 2. imagem_aprovada_asset_id apontando para asset que NÃO EXISTE
  -- =========================================================================
  begin
    update public.storyboard_scenes
       set imagem_aprovada_asset_id = gen_random_uuid()
     where id = v_cena;
    insert into resultado values (2, 'storyboard_scenes_aprovada_belongs_to_user',
      'aprovar asset inexistente', 'PASSOU', 'recusar', 'FALHA');
  exception when foreign_key_violation then
    insert into resultado values (2, 'storyboard_scenes_aprovada_belongs_to_user',
      'aprovar asset inexistente', 'recusou (23503)', 'recusar', 'OK');
  end;

  -- =========================================================================
  -- 3 e 4. O CRUZAMENTO ENTRE DONOS — o que a chave composta existe para barrar
  -- =========================================================================
  if v_tem_user_2 then
    insert into public.projects (user_id, name)
    values (v_user_2, 'projeto do outro dono') returning id into v_proj_2;

    insert into public.storyboards
      (user_id, project_id, node_id, ideia, canal, titulo, formato, estilo, genero)
    values (v_user_2, v_proj_2, 'node-do-outro', 'ideia', 'tiktok', 't', 'f', 'e', 'g')
    returning id into v_sb_2;

    insert into public.storyboard_scenes
      (storyboard_id, user_id, ordem, acao, cenario, enquadramento)
    values (v_sb_2, v_user_2, 1, 'acao', 'cenario', 'plano_americano')
    returning id into v_cena_2;

    insert into public.assets (user_id, kind, mime_type, storage_path, source)
    values (v_user_2, 'image', 'image/jpeg',
            'outro/dono/' || gen_random_uuid()::text || '.jpg', 'generation')
    returning id into v_asset_2;

    begin
      insert into public.generations
        (user_id, model_id, provider, model, media_kind, status, project_id, scene_id)
      values (v_user, v_modelo_img, 'x', 'x', 'image', 'failed', v_project, v_cena_2);
      insert into resultado values (3, 'generations_scene_belongs_to_user',
        'minha geração apontando para a cena DE OUTRO DONO', 'PASSOU', 'recusar', 'FALHA');
    exception when foreign_key_violation then
      insert into resultado values (3, 'generations_scene_belongs_to_user',
        'minha geração apontando para a cena DE OUTRO DONO', 'recusou (23503)', 'recusar', 'OK');
    end;

    begin
      update public.storyboard_scenes
         set imagem_aprovada_asset_id = v_asset_2 where id = v_cena;
      insert into resultado values (4, 'storyboard_scenes_aprovada_belongs_to_user',
        'aprovar na minha cena um asset DE OUTRO DONO', 'PASSOU', 'recusar', 'FALHA');
    exception when foreign_key_violation then
      insert into resultado values (4, 'storyboard_scenes_aprovada_belongs_to_user',
        'aprovar na minha cena um asset DE OUTRO DONO', 'recusou (23503)', 'recusar', 'OK');
    end;
  else
    insert into resultado values (3, 'generations_scene_belongs_to_user',
      'cena de outro dono', 'NAO EXERCITADO — auth.users recusou o usuario descartavel',
      'recusar', 'nao exercitado');
    insert into resultado values (4, 'storyboard_scenes_aprovada_belongs_to_user',
      'asset de outro dono', 'NAO EXERCITADO — auth.users recusou o usuario descartavel',
      'recusar', 'nao exercitado');
  end if;

  -- =========================================================================
  -- 5. APAGAR A FICHA NÃO APAGA A HISTÓRIA — o ON DELETE SET NULL de scene_id
  -- =========================================================================
  insert into public.generations
    (user_id, model_id, provider, model, media_kind, status, project_id, scene_id,
     sparks_charged, cost_charged_cents)
  values (v_user, v_modelo_img, 'x', 'x', 'image', 'succeeded', v_project, v_cena, 75, 75)
  returning id into v_gid;

  delete from public.storyboard_scenes where id = v_cena;

  -- Lido DIRETO, sem agregado. O `where id =` garante no máximo uma linha, então
  -- não há o que agregar — e `max(uuid)` NÃO EXISTE no Postgres (nem `min`).
  -- Foi exatamente esta linha que derrubou a primeira rodada destas travas, com
  -- `42883: function max(uuid) does not exist`, e o parser tinha aceitado.
  select count(*) into v_sobrou
    from public.generations where id = v_gid;

  select sparks_charged, scene_id into v_sparks, v_scene_depois
    from public.generations where id = v_gid;

  insert into resultado values (5, 'on delete set null (scene_id)',
    'apagar a ficha que uma geração COBRADA aponta',
    format('geração sobrou=%s · sparks=%s · scene_id=%s',
           v_sobrou, v_sparks, coalesce(v_scene_depois::text, 'NULL')),
    'sobrou=1, sparks=75, scene_id=NULL',
    case when v_sobrou = 1 and v_sparks = 75 and v_scene_depois is null
         then 'OK' else 'FALHA' end);

  -- Refaz a cena para os testes seguintes.
  insert into public.storyboard_scenes
    (storyboard_id, user_id, ordem, acao, cenario, enquadramento)
  select sb.id, v_user, 1, 'acao de teste', 'cenario de teste', 'plano_americano'
    from public.storyboards sb where sb.project_id = v_project limit 1
  returning id into v_cena;

  select sb.titulo into v_cena_titulo
    from public.storyboard_scenes s join public.storyboards sb on sb.id = s.storyboard_id
   where s.id = v_cena;
  v_cena_ordem := 1;

  -- =========================================================================
  -- 6. GN008 — cena sem projeto
  -- =========================================================================
  begin
    v_ger := public.record_generation(
      p_model_id => v_modelo_img, p_status => 'failed',
      p_scene_id => v_cena, p_project_id => null, p_image_size => v_tamanho);
    insert into resultado values (6, 'GN008',
      'record_generation com cena e SEM projeto', 'PASSOU', 'GN008', 'FALHA');
  exception
    when sqlstate 'GN008' then
      insert into resultado values (6, 'GN008',
        'record_generation com cena e SEM projeto', 'recusou GN008', 'GN008', 'OK');
    when others then
      insert into resultado values (6, 'GN008',
        'record_generation com cena e SEM projeto', 'recusou ' || sqlstate, 'GN008', 'FALHA');
  end;

  -- =========================================================================
  -- 7. GN008 — cena do projeto ERRADO
  -- =========================================================================
  begin
    v_ger := public.record_generation(
      p_model_id => v_modelo_img, p_status => 'failed',
      p_scene_id => v_cena, p_project_id => v_project_2, p_image_size => v_tamanho);
    insert into resultado values (7, 'GN008',
      'record_generation com cena do projeto ERRADO', 'PASSOU', 'GN008', 'FALHA');
  exception
    when sqlstate 'GN008' then
      insert into resultado values (7, 'GN008',
        'record_generation com cena do projeto ERRADO', 'recusou GN008', 'GN008', 'OK');
    when others then
      insert into resultado values (7, 'GN008',
        'record_generation com cena do projeto ERRADO', 'recusou ' || sqlstate, 'GN008', 'FALHA');
  end;

  -- =========================================================================
  -- 8. VD008 — o irmão, na submissão de vídeo
  -- =========================================================================
  if v_modelo_vid is not null then
    begin
      v_ger := public.submit_video_generation(
        p_model_id => v_modelo_vid, p_project_id => v_project_2, p_node_id => 'n',
        p_duration_seconds => v_dur, p_resolution => v_res, p_scene_id => v_cena);
      insert into resultado values (8, 'VD008',
        'submit_video_generation com cena do projeto ERRADO', 'PASSOU', 'VD008', 'FALHA');
    exception
      when sqlstate 'VD008' then
        insert into resultado values (8, 'VD008',
          'submit_video_generation com cena do projeto ERRADO', 'recusou VD008', 'VD008', 'OK');
      when others then
        insert into resultado values (8, 'VD008',
          'submit_video_generation com cena do projeto ERRADO', 'recusou ' || sqlstate,
          'VD008', 'FALHA');
    end;
  end if;

  -- =========================================================================
  -- 9. CONTROLE POSITIVO — a frase do extrato NOMEIA A CENA
  -- =========================================================================
  v_ger := public.record_generation(
    p_model_id => v_modelo_img, p_status => 'succeeded',
    p_scene_id => v_cena, p_project_id => v_project, p_image_size => v_tamanho,
    p_node_id => 'node-da-maquina');

  select lt.description into v_desc
    from public.ledger_transactions lt where lt.generation_id = v_ger.id;

  insert into resultado values (9, 'extrato nomeia a cena',
    'record_generation COM cena, succeeded',
    coalesce(v_desc, '(sem lançamento)'),
    format('Imagem da cena %s · «%s»', v_cena_ordem, left(btrim(v_cena_titulo), 60)),
    case when v_desc = format('Imagem da cena %s · «%s»', v_cena_ordem, left(btrim(v_cena_titulo), 60))
         then 'OK' else 'FALHA' end);

  -- =========================================================================
  -- 10. CONTROLE NEGATIVO — sem cena, a frase de hoje NÃO MUDA
  -- =========================================================================
  v_ger := public.record_generation(
    p_model_id => v_modelo_img, p_status => 'succeeded',
    p_project_id => v_project, p_image_size => v_tamanho, p_node_id => 'node-comum');

  select lt.description into v_desc
    from public.ledger_transactions lt where lt.generation_id = v_ger.id;

  insert into resultado values (10, 'o caminho de hoje não mudou',
    'record_generation SEM cena, succeeded',
    coalesce(v_desc, '(sem lançamento)'), 'Imagem no canvas',
    case when v_desc = 'Imagem no canvas' then 'OK' else 'FALHA' end);

  -- =========================================================================
  -- 11. A cena entra na linha JÁ NA SUBMISSÃO do vídeo (queued, sem cobrar)
  -- =========================================================================
  if v_modelo_vid is not null then
    v_ger := public.submit_video_generation(
      p_model_id => v_modelo_vid, p_project_id => v_project, p_node_id => 'node-da-maquina',
      p_duration_seconds => v_dur, p_resolution => v_res, p_scene_id => v_cena);

    insert into resultado values (11, 'scene_id na submissão',
      'submit_video_generation com cena válida',
      format('status=%s · scene_id=%s · sparks=%s',
             v_ger.status, coalesce(v_ger.scene_id::text, 'NULL'), v_ger.sparks_charged),
      'status=queued, scene_id preenchido, sparks=0',
      case when v_ger.status = 'queued' and v_ger.scene_id = v_cena and v_ger.sparks_charged = 0
           then 'OK' else 'FALHA' end);
  end if;

  -- =========================================================================
  -- 12. NO ACTION — apagar um asset APROVADO é RECUSADO
  -- =========================================================================
  --
  -- A trava que a migration 2 existe para criar. Um asset próprio, novo, que
  -- ninguém mais referencia — para o que reprovar ser esta constraint e não
  -- outra.
  insert into public.assets (user_id, kind, mime_type, storage_path, source)
  values (v_user, 'image', 'image/jpeg',
          'teste/aprovado/' || gen_random_uuid()::text || '.jpg', 'generation')
  returning id into v_asset_tmp;

  update public.storyboard_scenes
     set imagem_aprovada_asset_id = v_asset_tmp where id = v_cena;

  begin
    delete from public.assets where id = v_asset_tmp;
    insert into resultado values (12, 'on delete no action (aprovada)',
      'apagar um asset que é imagem APROVADA de uma cena', 'PASSOU — a aprovação sumiria',
      'recusar', 'FALHA');
  exception when foreign_key_violation then
    insert into resultado values (12, 'on delete no action (aprovada)',
      'apagar um asset que é imagem APROVADA de uma cena', 'recusou (23503)',
      'recusar', 'OK');
  end;

  -- =========================================================================
  -- 13. A CASCATA DO DIAMANTE — exclusão de conta PASSA sob NO ACTION
  -- =========================================================================
  --
  -- O risco que fez NO ACTION ganhar de RESTRICT: `assets` e `storyboard_scenes`
  -- penduram as duas em auth.users com ON DELETE CASCADE, e a cena aponta para
  -- o asset. Com RESTRICT a checagem dispararia no meio da cascata e a exclusão
  -- de conta abortaria — conforme a ordem, que não é definida. Com NO ACTION ela
  -- espera o fim do statement, quando as duas já sumiram.
  if v_tem_user_2 then
    update public.storyboard_scenes
       set imagem_aprovada_asset_id = v_asset_2 where id = v_cena_2;

    begin
      delete from auth.users where id = v_user_2;

      select (select count(*) from public.assets where id = v_asset_2),
             (select count(*) from public.storyboard_scenes where id = v_cena_2)
        into v_a, v_b;

      insert into resultado values (13, 'cascata da exclusão de conta',
        'delete from auth.users com asset APROVADO por cena do mesmo dono',
        format('passou · assets restantes=%s · cenas restantes=%s', v_a, v_b),
        'passar, e as duas linhas sumirem juntas (0 e 0)',
        case when v_a = 0 and v_b = 0 then 'OK' else 'FALHA' end);
    exception when others then
      insert into resultado values (13, 'cascata da exclusão de conta',
        'delete from auth.users com asset APROVADO por cena do mesmo dono',
        'ABORTOU: ' || sqlstate || ' · ' || sqlerrm,
        'passar, e as duas linhas sumirem juntas', 'FALHA');
    end;
  else
    insert into resultado values (13, 'cascata da exclusão de conta',
      'delete from auth.users com asset aprovado',
      'NAO EXERCITADO — auth.users recusou o usuario descartavel',
      'passar, e as duas linhas sumirem juntas', 'nao exercitado');
  end if;

  -- =========================================================================
  -- 14. APAGAR PROJETO — passa, e o asset SOBREVIVE
  -- =========================================================================
  --
  -- Aqui o diamante NÃO existe, e dizer isso é metade do teste: `assets` não
  -- tem project_id — ela pendura só em auth.users. Apagar um projeto apaga
  -- storyboards e cenas (cascata), e não encosta nos assets. Ou seja, a
  -- constraint NO ACTION nem é consultada: some o lado que REFERENCIA, que é
  -- sempre seguro. O que este teste prova é que o asset **fica**.
  insert into public.projects (user_id, name)
  values (v_user, 'projeto-tmp-c3-' || gen_random_uuid()::text) returning id into v_proj_tmp;

  insert into public.storyboards
    (user_id, project_id, node_id, ideia, canal, titulo, formato, estilo, genero)
  values (v_user, v_proj_tmp, 'node-tmp', 'ideia', 'tiktok', 't', 'f', 'e', 'g')
  returning id into v_sb_tmp;

  insert into public.storyboard_scenes
    (storyboard_id, user_id, ordem, acao, cenario, enquadramento, imagem_aprovada_asset_id)
  values (v_sb_tmp, v_user, 1, 'acao', 'cenario', 'plano_americano', v_asset_tmp)
  returning id into v_cena_tmp;

  begin
    delete from public.projects where id = v_proj_tmp;

    select (select count(*) from public.storyboard_scenes where id = v_cena_tmp),
           (select count(*) from public.assets where id = v_asset_tmp)
      into v_a, v_b;

    insert into resultado values (14, 'cascata do projeto',
      'apagar projeto cuja cena tem imagem aprovada',
      format('passou · cena restante=%s · asset restante=%s', v_a, v_b),
      'passar · cena=0 · asset=1 (assets não penduram em projeto)',
      case when v_a = 0 and v_b = 1 then 'OK' else 'FALHA' end);
  exception when others then
    insert into resultado values (14, 'cascata do projeto',
      'apagar projeto cuja cena tem imagem aprovada',
      'ABORTOU: ' || sqlstate || ' · ' || sqlerrm,
      'passar · cena=0 · asset=1', 'FALHA');
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- O relatório, forma 1: a tabela
-- ---------------------------------------------------------------------------

select n as "#", veredito, trava, tentei, aconteceu, esperado
  from resultado
 order by n;

-- ---------------------------------------------------------------------------
-- O relatório, forma 2: a exceção — que é também o que desfaz tudo
-- ---------------------------------------------------------------------------
--
-- Doutrina de 07/08/2026. Este "erro" É o relatório, e ele existe para que o
-- resultado apareça mesmo num editor que só mostre o último statement.

do $$
declare
  v_rel      text;
  v_total    integer;
  v_ok       integer;
  v_falhas   integer;
  v_naoexerc integer;
begin
  select count(*),
         count(*) filter (where veredito = 'OK'),
         count(*) filter (where veredito = 'FALHA'),
         count(*) filter (where veredito = 'nao exercitado'),
         string_agg(
           lpad(n::text, 2) || '  ' || rpad(veredito, 16) || trava
           || E'\n      tentei:   ' || tentei
           || E'\n      obtive:   ' || aconteceu
           || E'\n      esperado: ' || esperado,
           E'\n' order by n)
    into v_total, v_ok, v_falhas, v_naoexerc, v_rel
    from resultado;

  raise exception E'\n\n=====================================================================\n RELATORIO DAS TRAVAS — CICLO 3, FASE 1\n Este "erro" E o relatorio. Nada foi gravado: ele tambem e o rollback.\n=====================================================================\n\n%\n\n---------------------------------------------------------------------\n TOTAL %  ·  OK %  ·  FALHA %  ·  nao exercitado %\n=====================================================================\n',
    v_rel, v_total, v_ok, v_falhas, v_naoexerc;
end;
$$;

rollback;
