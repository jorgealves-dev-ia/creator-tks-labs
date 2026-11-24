-- ---------------------------------------------------------------------------
-- FRENTE 1 · F1 — AS TRAVAS DA LEITURA DE PRODUTO, executadas, não avaliadas.
-- ---------------------------------------------------------------------------
--
-- ⚠  RODE O ARQUIVO INTEIRO. O `begin;` da primeira linha não é decoração.
--
--    Sem ele, cada statement fecha sozinho: o bloco `DO` **commitaria** o
--    lançamento do controle positivo (4 ⚡ de verdade, num livro append-only
--    onde a correção é um estorno), e a exceção-relatório do fim chegaria tarde
--    demais para desfazê-lo.
--
--    Rodando o arquivo inteiro, nada disso é possível — e há um segundo cinto:
--    a tabela temporária `resultado` nasce aqui em cima, então o bloco `DO`
--    executado sozinho estoura no primeiro `insert into resultado` com
--    `42P01 undefined_table` e volta atrás inteiro, porque um `DO` é **um**
--    statement.
--
-- ---------------------------------------------------------------------------
-- O QUE ELE PROVA
-- ---------------------------------------------------------------------------
--
-- A migration `20261002121933_product_readings.sql` traz o padrão RAISE
-- EXCEPTION em três camadas (pedido do dono, 26/09/2026). Este arquivo provoca
-- cada uma, **no banco de verdade**, e confere que ela recusa o caso errado e
-- aceita o certo:
--
--   camada 1   a função `record_product_reading` recusa com frase e código
--              (EX001 saldo · EX003 modelo · EX004 projeto · EX005 foto) — e
--              aceita a leitura certa, cobrando o preço do catálogo;
--   camada 2   o banco recusa o que o app poderia esquecer: os CHECKs de
--              `extractions` e de `ai_models`, o índice único do padrão, e o
--              gatilho que confere o dono da foto;
--   camada 3   a conferência (`assert_product_reading_catalog`) recusa um
--              catálogo com o Sonnet marcado — o «nunca» do dono.
--
--     Trava que nunca reprovou de verdade ainda não é trava.  (regra do Jorge)
--
-- Roda DEPOIS de a migration estar aplicada. Antes disso ele não testa nada: a
-- primeira coisa que faz é perguntar se a função existe, e para ali, dizendo que
-- a migration ainda não foi aplicada.
--
-- Ele já rodou uma vez, inteiro, num Postgres em memória com as 40 migrations
-- do repositório (o «banco de ensaio» de 02/10/2026): 23 de 23. Aquilo provou o
-- script; isto prova a produção.
--
-- ---------------------------------------------------------------------------
-- POR QUE ESTE ARQUIVO ESTÁ NO REPOSITÓRIO
-- ---------------------------------------------------------------------------
--
-- Pela razão de `c3-scene-link.sql`: ele não é evidência — evidência é o
-- retrato de uma rodada, e mora em `scratchpad/evidencias/`. **Ele é prova
-- reexecutável**, e responde uma pergunta que volta toda vez que alguém
-- encostar em `record_product_reading`, em `extractions` ou no catálogo de
-- extração: *as travas ainda recusam?*
--
-- Não carrega segredo, não carrega URL assinada e não nomeia dado de ninguém:
-- pega o primeiro projeto e a primeira foto que encontrar.
--
-- ---------------------------------------------------------------------------
-- COMO RODAR, E ONDE O RELATÓRIO APARECE
-- ---------------------------------------------------------------------------
--
-- Cole tudo de uma vez no SQL Editor do painel do Supabase e rode.
--
-- **O relatório aparece DUAS vezes, de propósito:**
--
--   1. como TABELA, no resultado do `select`;
--   2. como MENSAGEM DE ERRO, no fim — e **esse "erro" é o relatório**. É a
--      doutrina de 07/08/2026: *a exceção é o relatório e é também o que desfaz
--      os dados de teste*.
--
-- Se aparecer um erro vermelho no fim com "RELATORIO DAS TRAVAS" dentro, **é
-- assim que tem de ser**. O que importa é a última linha dele:
--
--     TOTAL 23  ·  OK 23  ·  FALHA 0  ·  nao exercitado 0
--
-- Está inteiro dentro de BEGIN … ROLLBACK: nenhum modelo é chamado, nenhum
-- Spark sai do saldo de verdade, e os lançamentos dos controles existem por
-- milissegundos dentro da transação. **Confira depois: o saldo é o de antes.**

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
  v_user         uuid;
  v_project      uuid;
  v_foto         uuid;
  v_video        uuid;
  v_personagem   uuid;
  v_flash        uuid;
  v_haiku        uuid;
  v_sem_leitura  uuid;
  v_desligado    uuid;
  v_user_2       uuid;
  v_proj_2       uuid;
  v_foto_2       uuid;
  v_tem_user_2   boolean := false;
  v_proj_tmp     uuid;
  v_saldo        integer;
  v_saldo_depois integer;
  v_lanc         integer;
  v_lanc_depois  integer;
  v_linhas       integer;
  v_ext          public.extractions;
  v_desc         text;
  v_valor        integer;
  v_a            integer;
  v_texto        jsonb := jsonb_build_object(
                   'nome', 'Produto de teste da trava',
                   'descricao_pt', 'Um produto de teste, escrito pela prova das travas.',
                   'descricao_en', 'A test product, written by the locks proof.');
begin
  -- Antes de tudo: a migration está aplicada? Sem ela, metade dos casos abaixo
  -- "recusaria" por um motivo que não é a trava — a função não existir —, e um
  -- relatório cheio de recusas pelo motivo errado é pior que nenhum.
  if to_regprocedure('public.record_product_reading(uuid, text, uuid, uuid, public.extraction_status, jsonb, integer, integer, integer, jsonb, text)') is null
     or to_regprocedure('public.assert_product_reading_catalog()') is null then
    raise exception 'a migration 20261002121933_product_readings ainda não está aplicada neste banco — aplique-a antes de rodar as travas da F1';
  end if;

  -- =========================================================================
  -- Cenário: tudo real, nada inventado além do que a transação desfaz
  -- =========================================================================
  select p.id, p.user_id into v_project, v_user
    from public.projects p order by p.created_at limit 1;

  select a.id into v_foto
    from public.assets a where a.user_id = v_user and a.kind = 'image'
   order by a.created_at limit 1;

  select e.id into v_personagem
    from public.entities e
   where e.user_id = v_user and e.kind = 'character' and e.archived_at is null
   order by e.created_at limit 1;

  select m.id into v_flash from public.ai_models m where m.slug = 'gemini-3.7-flash';
  select m.id into v_haiku from public.ai_models m where m.slug = 'claude-haiku-4-5';

  -- Um modelo ligado que NÃO é de extração, e um de extração que está desligado.
  select m.id into v_sem_leitura
    from public.ai_models m
   where m.enabled and not ('extraction' = any (m.capabilities))
   order by m.slug limit 1;

  select m.id into v_desligado
    from public.ai_models m
   where not m.enabled and 'extraction' = any (m.capabilities)
   order by m.slug limit 1;

  if v_project is null or v_foto is null or v_flash is null or v_haiku is null
     or v_sem_leitura is null or v_desligado is null then
    raise exception 'faltou cenário: projeto=% foto=% flash=% haiku=% sem_leitura=% desligado=%',
      v_project, v_foto, v_flash, v_haiku, v_sem_leitura, v_desligado;
  end if;

  -- auth.uid() lê request.jwt.claims. Sem isto, a função recusaria com
  -- insufficient_privilege e nada abaixo teria sido testado de verdade.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_user::text)::text, true);

  -- Um vídeo do MESMO dono, para o caso "a foto é um vídeo".
  insert into public.assets (user_id, kind, mime_type, storage_path, source)
  values (v_user, 'video', 'video/mp4',
          'trava-f1/' || gen_random_uuid()::text || '.mp4', 'generation')
  returning id into v_video;

  -- Um SEGUNDO dono, para os casos de cruzamento. Guardado: se o schema do auth
  -- não deixar, os testes que dependem dele viram "nao exercitado" COM NOME —
  -- nunca OK por ausência.
  begin
    v_user_2 := gen_random_uuid();
    insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at)
    values (v_user_2, 'authenticated', 'authenticated',
            'teste-f1-' || v_user_2::text || '@exemplo.invalido',
            '{}'::jsonb, '{}'::jsonb, now(), now());

    insert into public.projects (user_id, name)
    values (v_user_2, 'projeto do outro dono') returning id into v_proj_2;

    insert into public.assets (user_id, kind, mime_type, storage_path, source)
    values (v_user_2, 'image', 'image/jpeg',
            'outro/dono/' || gen_random_uuid()::text || '.jpg', 'upload')
    returning id into v_foto_2;

    v_tem_user_2 := true;
  exception when others then
    v_tem_user_2 := false;
  end;

  select w.balance_cents into v_saldo from public.wallets w where w.user_id = v_user;
  select count(*) into v_lanc from public.ledger_transactions where user_id = v_user;

  -- =========================================================================
  -- CAMADA 1 — a função recusa com frase e código
  -- =========================================================================

  -- 1. O projeto é de outro dono → EX004
  if v_tem_user_2 then
    begin
      perform public.record_product_reading(v_proj_2, 'card-da-trava', v_flash, v_foto, 'succeeded', v_texto);
      insert into resultado values (1, 'record_product_reading · EX004',
        'ler um card num projeto DE OUTRO DONO', 'PASSOU', 'recusar com EX004', 'FALHA');
    exception when others then
      insert into resultado values (1, 'record_product_reading · EX004',
        'ler um card num projeto DE OUTRO DONO', sqlstate || ' · ' || sqlerrm, 'recusar com EX004',
        case when sqlstate = 'EX004' then 'OK' else 'FALHA' end);
    end;
  else
    insert into resultado values (1, 'record_product_reading · EX004',
      'ler um card num projeto DE OUTRO DONO', 'não foi possível criar o segundo dono',
      'recusar com EX004', 'nao exercitado');
  end if;

  -- 2. A foto é de outro dono → EX005
  if v_tem_user_2 then
    begin
      perform public.record_product_reading(v_project, 'card-da-trava', v_flash, v_foto_2, 'succeeded', v_texto);
      insert into resultado values (2, 'record_product_reading · EX005',
        'ler a foto DE OUTRO DONO', 'PASSOU', 'recusar com EX005', 'FALHA');
    exception when others then
      insert into resultado values (2, 'record_product_reading · EX005',
        'ler a foto DE OUTRO DONO', sqlstate || ' · ' || sqlerrm, 'recusar com EX005',
        case when sqlstate = 'EX005' then 'OK' else 'FALHA' end);
    end;
  else
    insert into resultado values (2, 'record_product_reading · EX005',
      'ler a foto DE OUTRO DONO', 'não foi possível criar o segundo dono',
      'recusar com EX005', 'nao exercitado');
  end if;

  -- 3. A «foto» é um vídeo → EX005
  begin
    perform public.record_product_reading(v_project, 'card-da-trava', v_flash, v_video, 'succeeded', v_texto);
    insert into resultado values (3, 'record_product_reading · EX005',
      'ler um VÍDEO como se fosse foto', 'PASSOU', 'recusar com EX005', 'FALHA');
  exception when others then
    insert into resultado values (3, 'record_product_reading · EX005',
      'ler um VÍDEO como se fosse foto', sqlstate || ' · ' || sqlerrm, 'recusar com EX005',
      case when sqlstate = 'EX005' then 'OK' else 'FALHA' end);
  end;

  -- 4. O modelo não é de extração → EX003
  begin
    perform public.record_product_reading(v_project, 'card-da-trava', v_sem_leitura, v_foto, 'succeeded', v_texto);
    insert into resultado values (4, 'record_product_reading · EX003',
      'ler com um modelo que NÃO é de extração', 'PASSOU', 'recusar com EX003', 'FALHA');
  exception when others then
    insert into resultado values (4, 'record_product_reading · EX003',
      'ler com um modelo que NÃO é de extração', sqlstate || ' · ' || sqlerrm, 'recusar com EX003',
      case when sqlstate = 'EX003' then 'OK' else 'FALHA' end);
  end;

  -- 5. O modelo está desligado (uma das linhas Gemini 2.5) → EX003
  begin
    perform public.record_product_reading(v_project, 'card-da-trava', v_desligado, v_foto, 'succeeded', v_texto);
    insert into resultado values (5, 'record_product_reading · EX003',
      'ler com um modelo de extração DESLIGADO', 'PASSOU', 'recusar com EX003', 'FALHA');
  exception when others then
    insert into resultado values (5, 'record_product_reading · EX003',
      'ler com um modelo de extração DESLIGADO', sqlstate || ' · ' || sqlerrm, 'recusar com EX003',
      case when sqlstate = 'EX003' then 'OK' else 'FALHA' end);
  end;

  -- 6. «Deu certo» sem texto → check_violation
  begin
    perform public.record_product_reading(v_project, 'card-da-trava', v_flash, v_foto, 'succeeded', null);
    insert into resultado values (6, 'record_product_reading · o texto',
      'gravar um SUCESSO sem as três frases', 'PASSOU', 'recusar (23514)', 'FALHA');
  exception when others then
    insert into resultado values (6, 'record_product_reading · o texto',
      'gravar um SUCESSO sem as três frases', sqlstate || ' · ' || sqlerrm, 'recusar (23514)',
      case when sqlstate = '23514' then 'OK' else 'FALHA' end);
  end;

  -- 7. «Falhou» trazendo texto → check_violation
  begin
    perform public.record_product_reading(v_project, 'card-da-trava', v_flash, v_foto, 'failed', v_texto);
    insert into resultado values (7, 'record_product_reading · o texto',
      'gravar uma FALHA trazendo texto', 'PASSOU', 'recusar (23514)', 'FALHA');
  exception when others then
    insert into resultado values (7, 'record_product_reading · o texto',
      'gravar uma FALHA trazendo texto', sqlstate || ' · ' || sqlerrm, 'recusar (23514)',
      case when sqlstate = '23514' then 'OK' else 'FALHA' end);
  end;

  -- 8. As sete recusas acima não deixaram resto
  select w.balance_cents into v_saldo_depois from public.wallets w where w.user_id = v_user;
  select count(*) into v_lanc_depois from public.ledger_transactions where user_id = v_user;
  select count(*) into v_linhas from public.extractions where node_id = 'card-da-trava';

  insert into resultado values (8, 'as recusas não deixam resto',
    'conferir saldo, ledger e extractions depois das recusas',
    format('saldo %s → %s · lançamentos %s → %s · linhas do card: %s', v_saldo, v_saldo_depois, v_lanc, v_lanc_depois, v_linhas),
    'saldo igual · lançamentos iguais · 0 linhas',
    case when v_saldo_depois = v_saldo and v_lanc_depois = v_lanc and v_linhas = 0 then 'OK' else 'FALHA' end);

  -- 9. CONTROLE POSITIVO — a leitura certa é aceita e cobra o preço do catálogo
  begin
    v_ext := public.record_product_reading(
      v_project, 'card-da-trava', v_flash, v_foto, 'succeeded', v_texto, 1662, 687, 3,
      '{"preenchidos": 2, "preservados": 0}'::jsonb);

    select l.amount_cents, l.description into v_valor, v_desc
      from public.ledger_transactions l where l.extraction_id = v_ext.id;
    select count(*) into v_a from public.ledger_transactions l where l.extraction_id = v_ext.id;
    select w.balance_cents into v_saldo_depois from public.wallets w where w.user_id = v_user;

    insert into resultado values (9, 'record_product_reading · o caso certo',
      'uma leitura que deu certo, no padrão da lista (gemini-3.7-flash)',
      format('aceita · subject=%s · cobrado=%s · lançamentos=%s de %s · saldo %s → %s · «%s»',
             v_ext.subject, v_ext.sparks_charged, v_a, v_valor, v_saldo, v_saldo_depois, v_desc),
      'aceitar · subject=product · cobrado=4 · 1 lançamento de -4 · saldo −4 · «Leitura de produto · …»',
      case when v_ext.subject = 'product' and v_ext.sparks_charged = 4 and v_ext.entity_id is null
                and v_ext.node_id = 'card-da-trava' and v_ext.reference_asset_id = v_foto
                and v_ext.reading ->> 'nome' = 'Produto de teste da trava'
                and v_a = 1 and v_valor = -4 and v_saldo_depois = v_saldo - 4
                and v_desc = 'Leitura de produto · Produto de teste da trava'
           then 'OK' else 'FALHA' end);
  exception when others then
    insert into resultado values (9, 'record_product_reading · o caso certo',
      'uma leitura que deu certo, no padrão da lista (gemini-3.7-flash)',
      'ABORTOU: ' || sqlstate || ' · ' || sqlerrm, 'aceitar e cobrar 4', 'FALHA');
  end;

  -- 10. FALHA É GRÁTIS — gravada, sem cobrança, sem lançamento
  begin
    select w.balance_cents into v_saldo from public.wallets w where w.user_id = v_user;
    select count(*) into v_lanc from public.ledger_transactions where user_id = v_user;

    v_ext := public.record_product_reading(
      v_project, 'card-da-trava', v_haiku, v_foto, 'failed', null, null, null, null, null,
      'the provider returned 503 (prova das travas)');

    select w.balance_cents into v_saldo_depois from public.wallets w where w.user_id = v_user;
    select count(*) into v_lanc_depois from public.ledger_transactions where user_id = v_user;

    insert into resultado values (10, 'falha é grátis',
      'uma leitura que FALHOU',
      format('gravada · status=%s · cobrado=%s · texto=%s · saldo %s → %s · lançamentos %s → %s',
             v_ext.status, v_ext.sparks_charged, coalesce(v_ext.reading::text, 'nulo'), v_saldo, v_saldo_depois, v_lanc, v_lanc_depois),
      'gravar · failed · cobrado=0 · texto nulo · saldo igual · nenhum lançamento novo',
      case when v_ext.status = 'failed' and v_ext.sparks_charged = 0 and v_ext.reading is null
                and v_saldo_depois = v_saldo and v_lanc_depois = v_lanc
           then 'OK' else 'FALHA' end);
  exception when others then
    insert into resultado values (10, 'falha é grátis',
      'uma leitura que FALHOU', 'ABORTOU: ' || sqlstate || ' · ' || sqlerrm,
      'gravar sem cobrar', 'FALHA');
  end;

  -- 11. Saldo insuficiente → EX001, sem linha e sem lançamento.
  --     A carteira é esvaziada por um lançamento DENTRO desta transação, que o
  --     rollback do fim desfaz — o saldo de verdade não muda.
  begin
    select w.balance_cents into v_saldo from public.wallets w where w.user_id = v_user;

    if v_saldo > 3 then
      insert into public.ledger_transactions (user_id, kind, amount_cents, description)
      values (v_user, 'debit', -(v_saldo - 3), 'prova das travas da F1 — desfeito pelo rollback');
    end if;

    select count(*) into v_linhas from public.extractions where user_id = v_user;

    begin
      perform public.record_product_reading(v_project, 'card-sem-saldo', v_flash, v_foto, 'succeeded', v_texto);
      insert into resultado values (11, 'record_product_reading · EX001',
        'ler com 3 ⚡ na carteira (a leitura custa 4)', 'PASSOU', 'recusar com EX001', 'FALHA');
    exception when others then
      select count(*) into v_a from public.extractions where user_id = v_user;
      select w.balance_cents into v_saldo_depois from public.wallets w where w.user_id = v_user;

      insert into resultado values (11, 'record_product_reading · EX001',
        'ler com 3 ⚡ na carteira (a leitura custa 4)',
        format('%s · %s · linhas %s → %s · saldo %s', sqlstate, sqlerrm, v_linhas, v_a, v_saldo_depois),
        'recusar com EX001 · nenhuma linha nova · saldo continua 3',
        case when sqlstate = 'EX001' and v_a = v_linhas and v_saldo_depois = least(v_saldo, 3) then 'OK' else 'FALHA' end);
    end;
  exception when others then
    insert into resultado values (11, 'record_product_reading · EX001',
      'ler com 3 ⚡ na carteira (a leitura custa 4)', 'ABORTOU: ' || sqlstate || ' · ' || sqlerrm,
      'recusar com EX001', 'FALHA');
  end;

  -- =========================================================================
  -- CAMADA 2 — o banco recusa o que o app poderia esquecer (sem a função)
  -- =========================================================================

  -- 12. Leitura de PRODUTO com personagem
  if v_personagem is not null then
    begin
      insert into public.extractions (user_id, subject, entity_id, project_id, node_id, model_id, source, status, sparks_charged, reference_asset_id, reading)
      values (v_user, 'product', v_personagem, v_project, 'card-direto', v_flash, 'photo', 'succeeded', 0, v_foto, v_texto);
      insert into resultado values (12, 'extractions_subject_shape',
        'leitura de PRODUTO apontando para uma personagem', 'PASSOU', 'recusar (23514)', 'FALHA');
    exception when check_violation then
      insert into resultado values (12, 'extractions_subject_shape',
        'leitura de PRODUTO apontando para uma personagem', 'recusou (23514) · ' || sqlerrm, 'recusar (23514)', 'OK');
    end;
  else
    insert into resultado values (12, 'extractions_subject_shape',
      'leitura de PRODUTO apontando para uma personagem', 'a conta não tem personagem para o teste',
      'recusar (23514)', 'nao exercitado');
  end if;

  -- 13. Leitura de PERSONAGEM sem personagem
  begin
    insert into public.extractions (user_id, subject, entity_id, model_id, source, status, sparks_charged, source_text)
    values (v_user, 'character', null, v_haiku, 'text', 'failed', 0, 'texto de teste da trava');
    insert into resultado values (13, 'extractions_subject_shape',
      'leitura de PERSONAGEM sem personagem', 'PASSOU', 'recusar (23514)', 'FALHA');
  exception when check_violation then
    insert into resultado values (13, 'extractions_subject_shape',
      'leitura de PERSONAGEM sem personagem', 'recusou (23514) · ' || sqlerrm, 'recusar (23514)', 'OK');
  end;

  -- 14. Produto que deu certo SEM texto
  begin
    insert into public.extractions (user_id, subject, project_id, node_id, model_id, source, status, sparks_charged, reference_asset_id, reading)
    values (v_user, 'product', v_project, 'card-direto', v_flash, 'photo', 'succeeded', 0, v_foto, null);
    insert into resultado values (14, 'extractions_reading_matches_outcome',
      'produto que deu certo SEM o texto da leitura', 'PASSOU', 'recusar (23514)', 'FALHA');
  exception when check_violation then
    insert into resultado values (14, 'extractions_reading_matches_outcome',
      'produto que deu certo SEM o texto da leitura', 'recusou (23514) · ' || sqlerrm, 'recusar (23514)', 'OK');
  end;

  -- 15. FALHA que cobra — a trava de 08/08, valendo para produto
  begin
    insert into public.extractions (user_id, subject, project_id, node_id, model_id, source, status, sparks_charged, reference_asset_id)
    values (v_user, 'product', v_project, 'card-direto', v_flash, 'photo', 'failed', 4, v_foto);
    insert into resultado values (15, 'extractions_failed_is_free',
      'gravar uma FALHA de produto com 4 ⚡ cobrados', 'PASSOU', 'recusar (23514)', 'FALHA');
  exception when check_violation then
    insert into resultado values (15, 'extractions_failed_is_free',
      'gravar uma FALHA de produto com 4 ⚡ cobrados', 'recusou (23514) · ' || sqlerrm, 'recusar (23514)', 'OK');
  end;

  -- 16. O GATILHO: a foto é de outro dono (escrevendo direto na tabela)
  if v_tem_user_2 then
    begin
      insert into public.extractions (user_id, subject, project_id, node_id, model_id, source, status, sparks_charged, reference_asset_id, reading)
      values (v_user, 'product', v_project, 'card-direto', v_flash, 'photo', 'succeeded', 0, v_foto_2, v_texto);
      insert into resultado values (16, 'gatilho extractions_product_reading_ownership',
        'escrever direto na tabela uma leitura com a foto DE OUTRO DONO', 'PASSOU', 'recusar (23514)', 'FALHA');
    exception when check_violation then
      insert into resultado values (16, 'gatilho extractions_product_reading_ownership',
        'escrever direto na tabela uma leitura com a foto DE OUTRO DONO', 'recusou (23514) · ' || sqlerrm, 'recusar (23514)', 'OK');
    end;
  else
    insert into resultado values (16, 'gatilho extractions_product_reading_ownership',
      'escrever direto na tabela uma leitura com a foto DE OUTRO DONO', 'não foi possível criar o segundo dono',
      'recusar (23514)', 'nao exercitado');
  end if;

  -- Nos quatro casos abaixo o catálogo é mexido de propósito. Se o banco NÃO
  -- recusar, o bloco levanta `P0001` para desfazer a mexida — e é o tratador
  -- dessa exceção que grava a FALHA: escrita dentro do bloco, ela seria desfeita
  -- junto, e um caso que falhou sumiria do relatório em vez de aparecer nele.

  -- 17. Marcar como padrão de produto um modelo SEM extraction
  begin
    update public.ai_models set is_product_reading_default = false where is_product_reading_default;
    update public.ai_models set is_product_reading_default = true where id = v_sem_leitura;
    raise exception 'o banco aceitou' using errcode = 'P0001';
  exception
    when check_violation then
      insert into resultado values (17, 'ai_models_product_reading_default_reads',
        'marcar como padrão de produto um modelo que NÃO lê', 'recusou (23514) · ' || sqlerrm, 'recusar (23514)', 'OK');
    when raise_exception then
      insert into resultado values (17, 'ai_models_product_reading_default_reads',
        'marcar como padrão de produto um modelo que NÃO lê', 'PASSOU', 'recusar (23514)', 'FALHA');
  end;

  -- 18. Marcar um SEGUNDO padrão
  begin
    update public.ai_models set is_product_reading_default = true where id = v_haiku;
    raise exception 'o banco aceitou' using errcode = 'P0001';
  exception
    when unique_violation then
      insert into resultado values (18, 'ai_models_one_product_reading_default',
        'marcar um SEGUNDO padrão de produto (o Haiku, com o Flash já marcado)', 'recusou (23505) · ' || sqlerrm, 'recusar (23505)', 'OK');
    when raise_exception then
      insert into resultado values (18, 'ai_models_one_product_reading_default',
        'marcar um SEGUNDO padrão de produto (o Haiku, com o Flash já marcado)', 'PASSOU', 'recusar (23505)', 'FALHA');
  end;

  -- 19. DESLIGAR o modelo que é o padrão
  begin
    update public.ai_models set enabled = false where id = v_flash;
    raise exception 'o banco aceitou' using errcode = 'P0001';
  exception
    when check_violation then
      insert into resultado values (19, 'ai_models_product_reading_default_reads',
        'desligar o modelo que é o padrão de produto', 'recusou (23514) · ' || sqlerrm, 'recusar (23514)', 'OK');
    when raise_exception then
      insert into resultado values (19, 'ai_models_product_reading_default_reads',
        'desligar o modelo que é o padrão de produto', 'PASSOU', 'recusar (23514)', 'FALHA');
  end;

  -- =========================================================================
  -- CAMADA 3 — a conferência: o «nunca» do dono
  -- =========================================================================

  -- 20. CONTROLE POSITIVO: contra o catálogo de hoje, ela passa
  begin
    perform public.assert_product_reading_catalog();
    insert into resultado values (20, 'assert_product_reading_catalog',
      'conferir o catálogo como está', 'passou', 'passar', 'OK');
  exception when others then
    insert into resultado values (20, 'assert_product_reading_catalog',
      'conferir o catálogo como está', 'RECUSOU: ' || sqlstate || ' · ' || sqlerrm, 'passar', 'FALHA');
  end;

  -- 21. Com o SONNET marcado, ela é exceção — e a frase diz por quê.
  --     (Marcar o Sonnet o banco deixa: ele é um modelo de extração ligado. Quem
  --     diz «nunca» é a conferência, e é ela que este caso provoca.)
  begin
    update public.ai_models set is_product_reading_default = false where is_product_reading_default;
    update public.ai_models set is_product_reading_default = true where slug = 'claude-sonnet-5';
    perform public.assert_product_reading_catalog();
    raise exception 'a conferência aceitou' using errcode = 'P0001';
  exception
    when check_violation then
      insert into resultado values (21, 'assert_product_reading_catalog',
        'conferir um catálogo com o SONNET marcado como padrão de produto', 'exceção (23514) · ' || sqlerrm,
        'exceção, com «Claude Sonnet must never be the default»',
        case when sqlerrm like '%Claude Sonnet must never be the default of the product list%' then 'OK' else 'FALHA' end);
    when raise_exception then
      insert into resultado values (21, 'assert_product_reading_catalog',
        'conferir um catálogo com o SONNET marcado como padrão de produto', 'PASSOU', 'exceção', 'FALHA');
  end;

  -- =========================================================================
  -- E o que NÃO pode quebrar
  -- =========================================================================

  -- 22. A personagem não muda: record_extraction grava como sempre (uma FALHA,
  --     que é grátis — nenhum Spark, nem por milissegundos)
  if v_personagem is not null then
    begin
      v_ext := public.record_extraction(v_personagem, v_haiku, 'text', 'failed', null, null, null, null,
                                        'texto de teste da trava da F1', null, 'prova das travas');
      insert into resultado values (22, 'record_extraction (intocada)',
        'gravar uma extração de PERSONAGEM pela função de sempre',
        format('gravada · subject=%s · personagem=%s · card=%s · texto=%s',
               v_ext.subject, v_ext.entity_id is not null, coalesce(v_ext.node_id, 'nulo'), coalesce(v_ext.reading::text, 'nulo')),
        'gravar · subject=character · com personagem · sem card · sem texto',
        case when v_ext.subject = 'character' and v_ext.entity_id = v_personagem
                  and v_ext.node_id is null and v_ext.project_id is null and v_ext.reading is null
             then 'OK' else 'FALHA' end);
    exception when others then
      insert into resultado values (22, 'record_extraction (intocada)',
        'gravar uma extração de PERSONAGEM pela função de sempre',
        'ABORTOU: ' || sqlstate || ' · ' || sqlerrm, 'gravar como sempre', 'FALHA');
    end;
  else
    insert into resultado values (22, 'record_extraction (intocada)',
      'gravar uma extração de PERSONAGEM pela função de sempre', 'a conta não tem personagem para o teste',
      'gravar como sempre', 'nao exercitado');
  end if;

  -- 23. Apagar o projeto NÃO apaga a leitura, e a trava de forma não segura o
  --     apagamento: `project_id` vira nulo, o card (texto) fica
  begin
    insert into public.projects (user_id, name)
    values (v_user, 'projeto-de-teste-f1-' || gen_random_uuid()::text)
    returning id into v_proj_tmp;

    v_ext := public.record_product_reading(v_proj_tmp, 'card-do-projeto-apagado', v_haiku, v_foto, 'failed',
                                           null, null, null, null, null, 'prova das travas');

    delete from public.projects where id = v_proj_tmp;

    select count(*), count(e.project_id) into v_a, v_linhas
      from public.extractions e where e.id = v_ext.id;

    insert into resultado values (23, 'apagar o projeto',
      'apagar um projeto que tem uma leitura de produto',
      format('passou · a leitura continua: %s · com project_id: %s', v_a, v_linhas),
      'passar · a leitura continua (1) · project_id nulo (0)',
      case when v_a = 1 and v_linhas = 0 then 'OK' else 'FALHA' end);
  exception when others then
    insert into resultado values (23, 'apagar o projeto',
      'apagar um projeto que tem uma leitura de produto',
      'ABORTOU: ' || sqlstate || ' · ' || sqlerrm, 'passar, e a leitura fica', 'FALHA');
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

  raise exception E'\n\n=====================================================================\n RELATORIO DAS TRAVAS — FRENTE 1, F1 (a leitura de produto)\n Este "erro" E o relatorio. Nada foi gravado: ele tambem e o rollback.\n=====================================================================\n\n%\n\n---------------------------------------------------------------------\n TOTAL %  ·  OK %  ·  FALHA %  ·  nao exercitado %\n=====================================================================\n',
    v_rel, v_total, v_ok, v_falhas, v_naoexerc;
end;
$$;

rollback;
