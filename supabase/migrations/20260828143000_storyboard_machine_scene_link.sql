-- FRENTE STORYBOARD · CICLO 3 · Fase 1 — a cena entra na linha da geração.
--
-- Plano: docs/plano-storyboard-c3.md (§7 · D1, decidida pelo Jorge em 28/08/2026).
--
-- ---------------------------------------------------------------------------
-- O QUE ESTA MIGRATION EXISTE PARA PERMITIR
-- ---------------------------------------------------------------------------
--
-- Duas frases do requisito do ciclo, e nenhuma das duas é possível hoje:
--
--   1. "uma linha de extrato por cena, com a descrição dizendo QUAL CENA de
--      qual storyboard"
--   2. "o trilho é espelho do banco"
--
-- Uma geração sabe de qual NODE ela veio (generations.node_id, desde a Fase 0)
-- e nunca de qual CENA. A Máquina rege dez fichas com UM node id — o dela —,
-- então sem esta coluna as dez gerações do lote são indistinguíveis entre si:
-- o extrato diria "Imagem no canvas" dez vezes, e o trilho não teria como saber
-- qual imagem é de qual cena senão guardando uma segunda cópia da verdade em
-- algum lugar que um dia discorda do banco.
--
-- ---------------------------------------------------------------------------
-- POR QUE ISTO NÃO É "UM CAMINHO DE COBRANÇA NOVO"
-- ---------------------------------------------------------------------------
--
-- É a MESMA função aprendendo mais um fato — exatamente o que o Ciclo 2 fez com
-- p_media_kind e p_job_kind em 16/08/2026. O preço continua sendo resposta do
-- catálogo, a transação continua sendo uma só, e a descrição do extrato continua
-- sendo COMPOSTA NO SERVIDOR: o chamador aponta uma linha (p_scene_id), nunca
-- escreve um nome. É a divisão de 10/08 — pode nomear, nunca pode alargar —
-- levada ao seu caso mais estrito: aqui nem nomear.
--
-- A alternativa descartada, registrada porque ela funcionaria: um node_id
-- composto ("<id da máquina>#cena-3"). Custaria zero migration e sobrecarregaria
-- uma coluna cujo comentário diz "the React Flow node id" — e deixaria o extrato
-- sem como nomear a cena a não ser parseando uma string em SQL.
--
-- ---------------------------------------------------------------------------
-- A FORMA DA LIGAÇÃO: A FK MORA NO LADO "MUITOS", E ELA É COMPOSTA
-- ---------------------------------------------------------------------------
--
-- Uma cena tem MUITAS gerações — todas as tentativas, inclusive as recusadas,
-- porque repetir é o gesto que a recusa não-determinística exige (medido em
-- 26/08/2026: o mesmo prompt recusado e aceito com 27 s de diferença). Então a
-- chave estrangeira mora em `generations`, e não uma coluna em
-- `storyboard_scenes` apontando para "a" geração — que só conseguiria guardar a
-- última e perderia o histórico exatamente da coisa que mais precisa dele.
--
-- COMPOSTA (scene_id, user_id), pelo precedente exato de project_entities
-- (11/08/2026) e de storyboards (16/08/2026): é o próprio Postgres que recusa a
-- cena de um usuário dentro da geração de outro. Nenhum código precisa lembrar.
--
-- ON DELETE SET NULL (scene_id), e a lista de coluna é obrigatória: sem ela o
-- SET NULL tentaria anular também user_id, que é NOT NULL, e o delete abortaria.
-- Substituir um roteiro APAGA as fichas antigas (é o que a Fase 1 do Ciclo 2
-- desenhou), e apagar ficha NUNCA pode apagar a história de quem pagou o quê:
-- `generations` e `ledger_transactions` continuam intactos, com a linha órfã de
-- cena e inteira de dinheiro.
--
-- ---------------------------------------------------------------------------
-- ORDEM DE APLICAÇÃO: SEGURA ANTES DO CÓDIGO, E ISSO FOI CONFERIDO
-- ---------------------------------------------------------------------------
--
-- Tudo é aditivo. As duas colunas nascem nulas, os dois parâmetros novos nascem
-- com default null, e NENHUM caminho que já roda alcança as linhas novas: um
-- chamador que não passa p_scene_id cai exatamente no comportamento de hoje,
-- incluindo a frase do extrato. Não há aqui a armadilha do GN006 (Etapa D2), em
-- que um backstop de banco subiu antes da checagem da aplicação e virou a única
-- checagem — porque não existe trava nova que possa disparar sobre caminho
-- existente.

-- ---------------------------------------------------------------------------
-- 1. Os uniques compostos que as duas FKs exigem
-- ---------------------------------------------------------------------------
--
-- Logicamente redundantes — `id` já é chave primária nas duas tabelas — e
-- estruturalmente obrigatórios: uma chave estrangeira composta exige um unique
-- composto do lado referenciado, e sem estas linhas o `db push` para com
-- "there is no unique constraint matching given keys".
--
-- Precedente idêntico e deliberado: projects_id_user_id_unique e
-- entities_id_user_id_unique (20260811140000), storyboards_id_user_id_unique
-- (20260816185603). O preço é um índice; o que se compra é o Postgres recusando,
-- sozinho, o cruzamento entre donos.

alter table public.storyboard_scenes
  add constraint storyboard_scenes_id_user_id_unique unique (id, user_id);

alter table public.assets
  add constraint assets_id_user_id_unique unique (id, user_id);

-- ---------------------------------------------------------------------------
-- 2. generations.scene_id — de qual ficha esta geração é
-- ---------------------------------------------------------------------------

alter table public.generations
  add column scene_id uuid;

alter table public.generations
  add constraint generations_scene_belongs_to_user
    foreign key (scene_id, user_id) references public.storyboard_scenes (id, user_id)
    on delete set null (scene_id);

comment on column public.generations.scene_id is
  'De qual ficha de cena esta geração é, quando ela veio de uma Máquina de '
  'Storyboard. Nula em toda geração que não veio de uma cena — o canvas comum, a '
  'imagem canônica, o roteiro inteiro. Uma cena tem MUITAS gerações (toda '
  'tentativa, inclusive as recusadas), então a chave mora aqui e não em '
  'storyboard_scenes: uma coluna do outro lado só guardaria a última. '
  'ON DELETE SET NULL porque substituir um roteiro apaga as fichas, e apagar '
  'ficha nunca pode apagar a história de quem pagou o quê.';

-- Parcial, porque a esmagadora maioria das gerações não tem cena — e um índice
-- sobre uma coluna quase toda nula é peso sem leitura. Mesmo desenho do índice
-- de derived_from_asset_id (15/08/2026).
create index generations_scene_id_idx
  on public.generations (scene_id)
  where scene_id is not null;

-- ---------------------------------------------------------------------------
-- 3. storyboard_scenes.imagem_aprovada_asset_id — QUAL imagem foi aprovada
-- ---------------------------------------------------------------------------
--
-- A única coisa deste ciclo que é DECISÃO e não fato, e por isso a única que
-- precisa de coluna. Todas as tentativas já estão em `generations`; o que só uma
-- pessoa pode dizer é qual delas vale.
--
-- E é um PONTEIRO, não um rótulo: "aprovada" não é um texto que possa discordar
-- da realidade — é o id da imagem que ganhou. Nula significa "ainda não
-- aprovada", e não existe estado em que a coluna diga uma coisa e o acervo diga
-- outra.
--
-- POR QUE NÃO REUSAR storyboard_scenes.status ('rascunho' | 'aprovada'), que já
-- existe: ela é editável no overlay desde a Fase 3 do Ciclo 2 e responde OUTRA
-- pergunta — "o TEXTO desta ficha foi revisado?". A desta coluna é "qual IMAGEM
-- desta cena foi aprovada?". São duas perguntas, e reusar uma coluna para as
-- duas faria a segunda ser lida como a primeira. Mesma separação de 15/08/2026:
-- `source` responde quem pôs o arquivo aqui, `derived_from_asset_id` responde de
-- onde vieram os pixels.

alter table public.storyboard_scenes
  add column imagem_aprovada_asset_id uuid;

alter table public.storyboard_scenes
  add constraint storyboard_scenes_aprovada_belongs_to_user
    foreign key (imagem_aprovada_asset_id, user_id) references public.assets (id, user_id)
    on delete set null (imagem_aprovada_asset_id);

comment on column public.storyboard_scenes.imagem_aprovada_asset_id is
  'Qual imagem desta cena foi aprovada para virar vídeo. Nula = não aprovada. É '
  'um ponteiro e não um rótulo: não existe estado em que ela discorde do acervo. '
  'Diferente de `status`, que responde se o TEXTO da ficha foi revisado — duas '
  'perguntas, duas colunas.';

create index storyboard_scenes_imagem_aprovada_idx
  on public.storyboard_scenes (imagem_aprovada_asset_id)
  where imagem_aprovada_asset_id is not null;

-- ---------------------------------------------------------------------------
-- 4. record_generation aprende p_scene_id
-- ---------------------------------------------------------------------------
--
-- O drop é obrigatório e não é higiene: `create or replace` com assinatura
-- DIFERENTE cria uma SEGUNDA função, e o banco ficaria com duas record_generation
-- sobrecarregadas — com a chamada resolvida por quem passasse quais argumentos.
-- Mesmo passo das três migrations anteriores que mexeram nesta assinatura.

drop function if exists public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text, text, public.media_kind, text
);

create or replace function public.record_generation(
  p_model_id uuid,
  p_status public.generation_status,
  p_entity_id uuid default null,
  p_prompt_compiled jsonb default null,
  p_params jsonb default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_real_cost_cents integer default null,
  p_result_asset_id uuid default null,
  p_entity_version_id uuid default null,
  p_sheet_source text default null,
  p_summary jsonb default null,
  p_error_message text default null,
  p_prompt_user_pt text default null,
  p_project_id uuid default null,
  p_node_id text default null,
  p_image_size text default null,
  -- Nasce com default 'image': é o que faz toda chamada já publicada continuar
  -- significando exatamente o que significava.
  p_media_kind public.media_kind default 'image',
  p_job_kind text default null,
  -- De qual ficha de cena é esta geração. Nulo em tudo o que não veio de uma
  -- Máquina — e nulo é o caminho de hoje, byte a byte.
  p_scene_id uuid default null
)
returns public.generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sparks integer;
  v_sized_sparks integer;
  v_charged integer;
  v_charged_cents integer;
  v_balance integer;
  v_handle text;
  v_provider_slug text;
  v_model_slug text;
  v_workflow_id uuid;
  v_scene_ordem integer;
  v_scene_titulo text;
  v_generation public.generations;
begin
  if v_user_id is null then
    raise exception 'record_generation requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  -- Vídeo tem duas funções próprias porque é assíncrono: submit_video_generation
  -- cria a linha `queued` sem cobrar, complete_video_generation cobra quando o
  -- vídeo existe. Aceitar 'video' aqui seria um terceiro caminho para o mesmo
  -- dinheiro, e o primeiro a divergir seria o que ninguém testa.
  if p_media_kind = 'video' then
    raise exception 'video generations are recorded by submit/complete_video_generation'
      using errcode = 'check_violation';
  end if;

  -- -------------------------------------------------------------------------
  -- Por que `p_media_kind::text = 'text'` e não `p_media_kind = 'text'`
  -- -------------------------------------------------------------------------
  --
  -- Não é estilo. O rótulo 'text' nasce na migration anterior, e a comparação
  -- direta obrigaria o Postgres a resolver o literal como rótulo do enum — o
  -- que só é possível DEPOIS que aquele ALTER TYPE tiver commitado.
  --
  -- Se o `supabase db push` roda cada arquivo na sua própria transação, isso
  -- está garantido. Só que **a documentação do CLI não diz isso em lugar
  -- nenhum e não há flag que o controle**, ou seja: seria uma aposta em
  -- comportamento não documentado, num arquivo que roda uma vez só, na mão de
  -- outra pessoa, no meio de quatro migrations.
  --
  -- Convertendo o enum para texto, nada aqui precisa que o rótulo exista no
  -- momento em que esta função é criada. A separação em dois arquivos continua
  -- (é o que a doc do PostgreSQL exige de fato); isto é o suspensório.
  if p_media_kind::text = 'text' and p_job_kind is null then
    raise exception 'a text generation must name its job kind'
      using errcode = 'check_violation';
  end if;

  if p_media_kind::text = 'text' and p_image_size is not null then
    raise exception 'a text generation has no image size'
      using errcode = 'check_violation';
  end if;

  -- A generation for a character must be for a character the caller owns.
  -- Checked here rather than trusted from the application because security
  -- definer means RLS is not doing it for us any more.
  if p_entity_id is not null then
    select e.handle into v_handle
      from public.entities e
     where e.id = p_entity_id
       and e.user_id = v_user_id
       and e.archived_at is null;

    if v_handle is null then
      raise exception 'character not found for this user'
        using errcode = 'GN002';
    end if;
  end if;

  -- Same rule for the project: without this check, security definer would let a
  -- caller file their generation under somebody else's tab. The workflow comes
  -- from the project itself — one project, one workflow, so there is nothing to
  -- reconcile and nothing to get wrong.
  if p_project_id is not null then
    select w.id into v_workflow_id
      from public.workflows w
      join public.projects p on p.id = w.project_id
     where w.project_id = p_project_id
       and p.user_id = v_user_id;

    if v_workflow_id is null then
      raise exception 'project not found for this user'
        using errcode = 'GN004';
    end if;
  end if;

  -- GN006 — a personagem tem de trabalhar neste projeto (Etapa D2).
  --
  -- Só quando os dois existem, e isso é o que mantém intactos os dois casos
  -- legítimos que não têm vínculo nenhum a consultar: a **geração canônica**,
  -- que nasce no editor da personagem e não tem projeto, e a geração de canvas
  -- **sem personagem**, que não tem quem vincular.
  --
  -- Nunca deveria disparar: a aplicação recusa antes, no passo 2, onde a recusa
  -- é de graça. Está aqui para o dia em que um caminho novo esquecer daquela
  -- linha — e nesse dia é melhor uma imagem perdida do que uma menção resolvida
  -- fora do escopo do projeto que a pagou.
  --
  -- E a partir desta migration ele vale também para o ROTEIRO, sem uma linha
  -- nova: uma ficha que menciona @luna passa o entity_id por aqui.
  if p_entity_id is not null and p_project_id is not null then
    if not exists (
      select 1
        from public.project_entities pe
       where pe.project_id = p_project_id
         and pe.entity_id = p_entity_id
    ) then
      raise exception 'character is not linked to this project'
        using errcode = 'GN006';
    end if;
  end if;

  -- GN008 — a cena tem de ser do chamador E deste projeto (Ciclo 3, D1).
  --
  -- A FK composta já recusaria a cena de outro usuário, mas com uma mensagem de
  -- constraint que ninguém consegue mostrar a alguém. Aqui a recusa tem código,
  -- e a interface tem o que dizer — a mesma doutrina dos GN001..GN007.
  --
  -- E ela pede o projeto junto de propósito: uma cena pertence a um storyboard,
  -- que pertence a um projeto. Aceitar cena sem projeto deixaria a geração de um
  -- lote arquivada fora da aba que a pagou, que é exatamente o que o GN004
  -- existe para impedir no caso geral.
  --
  -- O título e a ordem são lidos AQUI, e não na hora de escrever o extrato, por
  -- um motivo de doutrina: a frase do lançamento é composta no servidor a partir
  -- do dado, nunca do que o chamador mandou.
  if p_scene_id is not null then
    if p_project_id is null then
      raise exception 'a scene generation must name its project'
        using errcode = 'GN008';
    end if;

    select s.ordem, sb.titulo
      into v_scene_ordem, v_scene_titulo
      from public.storyboard_scenes s
      join public.storyboards sb on sb.id = s.storyboard_id
     where s.id = p_scene_id
       and s.user_id = v_user_id
       and sb.project_id = p_project_id;

    if v_scene_ordem is null then
      raise exception 'scene not found for this user in this project'
        using errcode = 'GN008';
    end if;
  end if;

  -- -------------------------------------------------------------------------
  -- O preço é sempre resposta do catálogo, e nunca do chamador. O que muda
  -- entre os dois ramos é QUAL pergunta o catálogo responde.
  -- -------------------------------------------------------------------------

  if p_media_kind::text = 'text' then
    select p.slug, m.slug
      into v_provider_slug, v_model_slug
      from public.ai_models m
      join public.ai_providers p on p.id = m.provider_id
     where m.id = p_model_id
       and m.enabled
       and p.enabled
       and 'text_gen' = any (m.capabilities);

    if v_model_slug is null then
      raise exception 'model is not an enabled text generation model'
        using errcode = 'GN003';
    end if;

    -- Sem preço-base para cair: ao contrário da imagem, não existe
    -- `ai_models.text_sparks`. Um trabalho sem linha de preço é um trabalho que
    -- não se sabe cobrar, e cobrar por adivinhação é exatamente o buraco que
    -- esta tabela fecha.
    select tp.sparks into v_sparks
      from public.ai_model_text_prices tp
     where tp.model_id = p_model_id
       and tp.job_kind = p_job_kind;

    if v_sparks is null then
      raise exception 'model has no price for this text job kind'
        using errcode = 'GN007';
    end if;
  else
    -- The price is the catalogue's answer, and the model has to actually be an
    -- image model that is switched on — for itself and for its provider.
    select m.image_sparks, p.slug, m.slug
      into v_sparks, v_provider_slug, v_model_slug
      from public.ai_models m
      join public.ai_providers p on p.id = m.provider_id
     where m.id = p_model_id
       and m.enabled
       and p.enabled
       and 'image_gen' = any (m.capabilities);

    if v_sparks is null then
      raise exception 'model is not an enabled image generation model'
        using errcode = 'GN003';
    end if;

    -- Um tamanho nomeado troca o preço-base pelo preço daquele tamanho — e, se não
    -- houver linha, **recusa**. Cair no preço-base seria entregar 4K cobrando 2K,
    -- que é precisamente o buraco que esta tabela existe para fechar. Quem não
    -- nomeia tamanho (a geração canônica) segue no preço-base, sem mudança nenhuma.
    if p_image_size is not null then
      select ip.sparks into v_sized_sparks
        from public.ai_model_image_prices ip
       where ip.model_id = p_model_id
         and ip.image_size = p_image_size;

      if v_sized_sparks is null then
        raise exception 'model has no price for this image size'
          using errcode = 'GN005';
      end if;

      v_sparks := v_sized_sparks;
    end if;
  end if;

  -- Failure is free. Everything else pays the catalogue price.
  --
  -- É a mesma linha de sempre, e é ela que cumpre o requisito 1 deste ciclo sem
  -- nada de novo: JSON inválido faz a aplicação chamar com status 'failed', e
  -- 'failed' não cobra — por este `case` e pela constraint
  -- generations_failed_is_free, que vale mesmo se o `case` fosse esquecido.
  v_charged := case when p_status = 'succeeded' then v_sparks else 0 end;
  v_charged_cents := v_charged * public.cents_per_spark();

  if v_charged > 0 then
    select w.balance_cents into v_balance
      from public.wallets w
     where w.user_id = v_user_id
       for update;

    -- The wallet constraint would abort the transaction anyway; checking first
    -- only buys a code the interface can turn into a sentence. The row is
    -- locked above so the check and the debit cannot be separated by another
    -- transaction.
    if coalesce(v_balance, 0) < v_charged_cents then
      raise exception 'insufficient balance for this generation'
        using errcode = 'GN001';
    end if;
  end if;

  insert into public.generations (
    user_id, entity_id, model_id, provider, model, params, media_kind,
    project_id, workflow_id, node_id, scene_id,
    prompt_user_pt, prompt_compiled, status, input_tokens, output_tokens,
    cost_real_cents, cost_charged_cents, sparks_charged,
    result_asset_id, entity_version_id, sheet_source, summary, error_message,
    completed_at
  )
  values (
    v_user_id, p_entity_id, p_model_id, v_provider_slug, v_model_slug,
    coalesce(p_params, '{}'::jsonb), p_media_kind,
    p_project_id, v_workflow_id, p_node_id, p_scene_id,
    p_prompt_user_pt, p_prompt_compiled, p_status, p_input_tokens, p_output_tokens,
    coalesce(p_real_cost_cents, 0), v_charged_cents, v_charged,
    p_result_asset_id, p_entity_version_id, p_sheet_source, p_summary,
    p_error_message,
    now()
  )
  returning * into v_generation;

  if v_charged > 0 then
    -- The legitimate ledger path: a signed row whose insert trigger projects the
    -- new balance onto the wallet. Identical in shape to the debit
    -- record_extraction writes, pointing at generation_id instead.
    --
    -- Which sentence the user reads is decided by the data, never by the
    -- caller: a generation with a node came from the canvas, and one without a
    -- node came from the canonical column of the editor. Saying "imagem
    -- canônica de @luna" for a scene the user directed would be a small lie
    -- printed on a financial record.
    --
    -- O ramo de texto existe pela mesma razão, e ele é obrigatório: sem ele o
    -- extrato diria "Imagem no canvas" para um roteiro, e um extrato que nomeia
    -- errado o que foi comprado é pior do que um extrato que não nomeia nada.
    --
    -- E o ramo de CENA existe pela razão mais forte de todas: a Máquina rege dez
    -- fichas com um node id só, então sem ele o extrato de um lote seriam dez
    -- linhas idênticas — e um extrato em que dez compras diferentes têm o mesmo
    -- nome não é auditável. O título é truncado em 60 porque um extrato é uma
    -- lista que se lê de relance, não um documento.
    insert into public.ledger_transactions (
      user_id, kind, amount_cents, cost_real_cents, cost_charged_cents,
      generation_id, description
    )
    values (
      v_user_id,
      'debit',
      -v_charged_cents,
      p_real_cost_cents,
      v_charged_cents,
      v_generation.id,
      case
        when p_media_kind::text = 'text' then
          case p_job_kind
            when 'cena' then 'Cena de roteiro regerada'
            when 'estruturar' then 'Roteiro estruturado'
            else 'Roteiro'
          end
          || case when v_handle is not null then ' com @' || v_handle else '' end
          || case when v_scene_ordem is not null then ' · cena ' || v_scene_ordem else '' end
        when v_scene_ordem is not null
          then 'Imagem da cena ' || v_scene_ordem || ' · «' || left(btrim(v_scene_titulo), 60) || '»'
        when p_node_id is not null and v_handle is not null
          then 'Imagem no canvas com @' || v_handle
        when p_node_id is not null then 'Imagem no canvas'
        when v_handle is not null then 'Imagem canônica de @' || v_handle
        else 'Geração de imagem'
      end
    );
  end if;

  return v_generation;
end;
$$;

comment on function public.record_generation is
  'Registra uma geração e, no sucesso, debita o ledger por ela — numa transação '
  'só. O preço é lido do catálogo e nunca aceito do chamador: '
  'ai_model_image_prices pelo tamanho nomeado, ai_models.image_sparks quando '
  'nenhum é nomeado, e ai_model_text_prices pelo tipo de trabalho quando '
  'p_media_kind = text. Vídeo NÃO passa por aqui: ele é assíncrono e tem '
  'submit/complete_video_generation. p_scene_id liga a geração a uma ficha de '
  'cena (Ciclo 3): o chamador aponta a linha, e a descrição do extrato é '
  'composta aqui a partir dela. Recusa com GN001 (saldo), GN002 (personagem não '
  'é do chamador), GN003 (modelo não habilitado para esta mídia), GN004 '
  '(projeto não é do chamador), GN005 (sem preço para o tamanho), GN006 '
  '(personagem não vinculada ao projeto), GN007 (sem preço para o tipo de '
  'trabalho de texto) ou GN008 (cena não é do chamador ou não é deste projeto), '
  'para a interface explicar cada caso em português. Gêmea de '
  'public.record_extraction.';

-- ---------------------------------------------------------------------------
-- Concessões, reemitidas contra a assinatura nova
-- ---------------------------------------------------------------------------
--
-- Uma função removida leva as concessões dela junto, então isto não é repetição:
-- sem estas linhas a assinatura nova cairia no EXECUTE default que PUBLIC
-- carrega — que é exatamente o que o primeiro revoke existe para tirar.

revoke execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text, text, public.media_kind, text, uuid
) from public, anon;

grant execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text, text, public.media_kind, text, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. submit_video_generation aprende p_scene_id
-- ---------------------------------------------------------------------------
--
-- O vídeo grava a cena na SUBMISSÃO, e não na conclusão, pelo mesmo motivo que
-- ele grava tudo o mais lá: a linha nasce antes de a fal ser chamada, e o
-- webhook chega sem sessão. Se a cena entrasse só no complete, um trabalho vivo
-- não saberia de qual cena é — e o trilho, que lê o banco, teria um buraco
-- exatamente durante os 60 a 90 segundos em que a pessoa está olhando.
--
-- VD008 é o irmão do GN008, e existe pelo mesmo motivo: a FK composta recusaria,
-- mas com uma mensagem de constraint que a tela não pode mostrar a ninguém.

drop function if exists public.submit_video_generation(
  uuid, uuid, text, integer, text, text, jsonb, jsonb, jsonb
);

create or replace function public.submit_video_generation(
  p_model_id uuid,
  p_project_id uuid,
  p_node_id text,
  p_duration_seconds integer,
  p_resolution text,
  p_prompt_user_pt text default null,
  p_prompt_compiled jsonb default null,
  p_params jsonb default null,
  p_summary jsonb default null,
  p_scene_id uuid default null
)
returns public.generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_provider_slug text;
  v_model_slug text;
  v_sparks integer;
  v_workflow_id uuid;
  v_balance integer;
  v_scene_ordem integer;
  v_generation public.generations;
begin
  if v_user_id is null then
    raise exception 'submit_video_generation requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  -- O projeto tem de ser de quem chama. `security definer` desliga o RLS, então
  -- esta checagem é a que sobra — sem ela, alguém arquivaria a própria geração
  -- na aba de outra pessoa. O workflow vem do projeto e nunca é aceito: um
  -- projeto tem exatamente um workflow, então quem pudesse nomear os dois só
  -- poderia introduzir a chance de discordarem.
  select w.id into v_workflow_id
    from public.workflows w
    join public.projects p on p.id = w.project_id
   where w.project_id = p_project_id
     and p.user_id = v_user_id;

  if v_workflow_id is null then
    raise exception 'project not found for this user'
      using errcode = 'VD002';
  end if;

  -- VD008 — a cena tem de ser do chamador e deste projeto (Ciclo 3, D1).
  if p_scene_id is not null then
    select s.ordem into v_scene_ordem
      from public.storyboard_scenes s
      join public.storyboards sb on sb.id = s.storyboard_id
     where s.id = p_scene_id
       and s.user_id = v_user_id
       and sb.project_id = p_project_id;

    if v_scene_ordem is null then
      raise exception 'scene not found for this user in this project'
        using errcode = 'VD008';
    end if;
  end if;

  -- O modelo, e ele tem de ser de vídeo e estar aceso — para si e para o
  -- fornecedor dele.
  select p.slug, m.slug
    into v_provider_slug, v_model_slug
    from public.ai_models m
    join public.ai_providers p on p.id = m.provider_id
   where m.id = p_model_id
     and m.enabled
     and p.enabled
     and 'video_gen' = any (m.capabilities);

  if v_model_slug is null then
    raise exception 'model is not an enabled video generation model'
      using errcode = 'VD003';
  end if;

  -- O preço, do catálogo e só do catálogo. Sem fallback: um modelo cuja tabela
  -- não precifica esta duração não pode gerar por um preço que a gente saiba
  -- nomear — e nomear outro é como 10 segundos acabariam cobrados como 5.
  select vp.sparks into v_sparks
    from public.ai_model_video_prices vp
   where vp.model_id = p_model_id
     and vp.duration_seconds = p_duration_seconds
     and vp.resolution = p_resolution;

  if v_sparks is null then
    raise exception 'model has no price for this duration and resolution'
      using errcode = 'VD004';
  end if;

  -- Saldo conferido agora, para a recusa ser barata e amigável. Não é reserva:
  -- nada é debitado nem bloqueado, e o mesmo saldo é conferido de novo lá na
  -- frente, quando houver vídeo para pagar.
  select w.balance_cents into v_balance
    from public.wallets w
   where w.user_id = v_user_id;

  if coalesce(v_balance, 0) < v_sparks * public.cents_per_spark() then
    raise exception 'insufficient balance for this video'
      using errcode = 'VD001';
  end if;

  insert into public.generations (
    user_id, model_id, provider, model, media_kind, status,
    project_id, workflow_id, node_id, scene_id,
    prompt_user_pt, prompt_compiled, summary, params,
    cost_real_cents, cost_charged_cents, sparks_charged
  )
  values (
    v_user_id, p_model_id, v_provider_slug, v_model_slug, 'video', 'queued',
    p_project_id, v_workflow_id, p_node_id, p_scene_id,
    p_prompt_user_pt, p_prompt_compiled, p_summary,
    -- As chaves da casa vão à direita do `||` de propósito: elas vencem o que
    -- o chamador mandou. Duração e resolução decidem o preço mais tarde, então
    -- não podem ser texto vindo do navegador — são os valores que esta função
    -- acabou de validar contra o catálogo.
    coalesce(p_params, '{}'::jsonb) || jsonb_build_object(
      'duration_seconds', p_duration_seconds,
      'resolution', p_resolution,
      'endpoint', v_model_slug
    ),
    0, 0, 0
  )
  returning * into v_generation;

  return v_generation;
end;
$$;

comment on function public.submit_video_generation is
  'Cria a linha de uma geração de vídeo como queued, antes de o provedor ser '
  'chamado — e sem cobrar nada. Fila é intenção, ledger é fato (invariante 5): '
  'o saldo é conferido aqui só para a recusa ser barata, e o débito acontece em '
  'complete_video_generation, quando existe vídeo. Duração e resolução são '
  'validadas contra ai_model_video_prices e gravadas em params, de onde o preço '
  'será relido — o chamador nomeia, o catálogo precifica. p_scene_id liga o '
  'trabalho a uma ficha já na submissão, para o trilho da Máquina saber de qual '
  'cena é um vídeo que ainda está gerando. Recusa com VD001 (saldo), VD002 '
  '(projeto não é do chamador), VD003 (modelo não é de vídeo habilitado), VD004 '
  '(sem preço para essa duração e resolução) e VD008 (cena não é do chamador ou '
  'não é deste projeto).';

revoke execute on function public.submit_video_generation(
  uuid, uuid, text, integer, text, text, jsonb, jsonb, jsonb, uuid
) from public, anon;

grant execute on function public.submit_video_generation(
  uuid, uuid, text, integer, text, text, jsonb, jsonb, jsonb, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. complete_video_generation nomeia a cena no extrato
-- ---------------------------------------------------------------------------
--
-- A assinatura NÃO muda: quem chama é o webhook da fal e a reconciliação, e
-- nenhum dos dois sabe de cena nenhuma — nem precisa. A cena já está na linha,
-- gravada na submissão, e é de lá que ela é lida.
--
-- Isto é o mesmo princípio do preço nesta função: o chamador não diz quanto
-- custa, o banco pergunta de novo ao catálogo. Aqui o chamador não diz de qual
-- cena é, o banco pergunta de novo à linha.
--
-- Sem drop, porque a assinatura é idêntica — `create or replace` substitui o
-- corpo e PRESERVA as concessões existentes (só a service role executa esta).

create or replace function public.complete_video_generation(
  p_generation_id uuid,
  p_provider_job_id text,
  p_status public.generation_status,
  p_result_asset_id uuid default null,
  p_real_cost_cents integer default null,
  p_error_message text default null
)
returns public.generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_generation public.generations;
  v_sparks integer;
  v_charged integer;
  v_charged_cents integer;
  v_balance integer;
  v_real_cost integer;
  v_scene_ordem integer;
  v_scene_titulo text;
begin
  if p_status not in ('succeeded', 'failed') then
    raise exception 'a video generation can only be completed as succeeded or failed'
      using errcode = 'VD007';
  end if;

  -- A trava que torna a reentrega segura, inclusive simultânea.
  select * into v_generation
    from public.generations
   where id = p_generation_id
     and media_kind = 'video'
   for update;

  if v_generation.id is null then
    raise exception 'no video generation with this id'
      using errcode = 'VD005';
  end if;

  -- Já terminou: não faz nada e devolve o que já era. Esta é a idempotência, e
  -- ela vem antes de qualquer escrita de propósito.
  if v_generation.status in ('succeeded', 'failed', 'canceled') then
    return v_generation;
  end if;

  -- O protocolo tem de bater. A linha pode ainda não ter um — é a janela entre
  -- o submit à fal e o attach — e nesse caso o webhook, que é assinado, é a
  -- autoridade sobre qual trabalho é este.
  if p_provider_job_id is not null and length(btrim(p_provider_job_id)) > 0 then
    if v_generation.provider_job_id is null then
      update public.generations
         set provider_job_id = p_provider_job_id
       where id = v_generation.id;
    elsif v_generation.provider_job_id <> p_provider_job_id then
      raise exception 'this delivery does not belong to this generation'
        using errcode = 'VD006';
    end if;
  end if;

  v_charged := 0;
  v_real_cost := coalesce(p_real_cost_cents, 0);

  if p_status = 'succeeded' then
    -- O preço, relido do catálogo pelo que a própria função de submissão gravou
    -- em params. Não é o chamador dizendo quanto custa: é o banco perguntando de
    -- novo ao catálogo, com valores que ele mesmo validou lá atrás.
    select vp.sparks, coalesce(p_real_cost_cents, vp.real_cost_cents)
      into v_sparks, v_real_cost
      from public.ai_model_video_prices vp
     where vp.model_id = v_generation.model_id
       and vp.duration_seconds = (v_generation.params->>'duration_seconds')::integer
       and vp.resolution = v_generation.params->>'resolution';

    if v_sparks is null then
      raise exception 'model has no price for this duration and resolution'
        using errcode = 'VD004';
    end if;

    v_charged := v_sparks;
    v_charged_cents := v_charged * public.cents_per_spark();

    select w.balance_cents into v_balance
      from public.wallets w
     where w.user_id = v_generation.user_id
     for update;

    if coalesce(v_balance, 0) < v_charged_cents then
      -- Sem exceção, de propósito — ver o cabeçalho. A linha vira failed com o
      -- motivo, ninguém é cobrado, e a fal recebe 2xx e para de reentregar.
      update public.generations
         set status = 'failed',
             error_message = 'saldo insuficiente quando o vídeo ficou pronto',
             cost_real_cents = v_real_cost,
             completed_at = now()
       where id = v_generation.id
      returning * into v_generation;

      return v_generation;
    end if;
  end if;

  update public.generations
     set status = p_status,
         result_asset_id = case when p_status = 'succeeded' then p_result_asset_id else null end,
         sparks_charged = v_charged,
         cost_charged_cents = coalesce(v_charged_cents, 0),
         cost_real_cents = v_real_cost,
         error_message = p_error_message,
         completed_at = now()
   where id = v_generation.id
  returning * into v_generation;

  if v_charged > 0 then
    -- De qual cena é este vídeo, lido da LINHA e não do chamador (Ciclo 3, D1).
    -- Fica dentro do ramo que cobra porque é a única coisa que usa o resultado:
    -- um vídeo que não cobrou não escreve lançamento nenhum.
    --
    -- E ela pode não achar nada mesmo com scene_id preenchido — não pode, na
    -- prática, porque o ON DELETE SET NULL anula a coluna quando a ficha some;
    -- o coalesce abaixo existe assim mesmo, porque um extrato é o último lugar
    -- do sistema onde vale a pena arriscar um NULL propagando para dentro de uma
    -- concatenação e apagando a frase inteira.
    if v_generation.scene_id is not null then
      select s.ordem, sb.titulo
        into v_scene_ordem, v_scene_titulo
        from public.storyboard_scenes s
        join public.storyboards sb on sb.id = s.storyboard_id
       where s.id = v_generation.scene_id;
    end if;

    insert into public.ledger_transactions (
      user_id, kind, amount_cents, cost_real_cents, cost_charged_cents,
      generation_id, description
    )
    values (
      v_generation.user_id,
      'debit',
      -v_charged_cents,
      v_real_cost,
      v_charged_cents,
      v_generation.id,
      case
        when v_scene_ordem is not null
          then 'Vídeo da cena ' || v_scene_ordem
               || ' · «' || left(btrim(coalesce(v_scene_titulo, 'roteiro')), 60) || '»'
        else 'Vídeo no canvas'
      end
    );
  end if;

  return v_generation;
end;
$$;

comment on function public.complete_video_generation is
  'Conclui uma geração de vídeo e, no sucesso, debita o ledger por ela — numa '
  'transação só. Chamada pelo webhook da fal e pela reconciliação, pelas duas '
  'pelo mesmo caminho. É idempotente por for update + saída antecipada em linha '
  'terminal, o que a torna segura sob reentrega simultânea, não só repetida: a '
  'fal reentrega até 31 vezes. O preço é relido de ai_model_video_prices e nunca '
  'aceito do chamador, e a CENA é relida da própria linha pelo mesmo princípio — '
  'quem chama não sabe de cena nenhuma. Saldo que acabou durante a geração NÃO '
  'levanta exceção — marca failed com motivo e não cobra, senão a linha ficaria '
  'running e as 31 reentregas receberiam o mesmo erro. Recusa com VD004 (sem '
  'preço), VD005 (geração inexistente ou de outra mídia), VD006 (entrega de '
  'outro trabalho) e VD007 (status inválido para conclusão). Só a service role '
  'executa: o webhook chega sem sessão, então auth.uid() é nulo e o user_id vem '
  'da linha.';
