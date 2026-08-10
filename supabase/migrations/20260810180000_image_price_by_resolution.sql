-- O preço de uma imagem passa a depender do tamanho dela.
--
-- Especificação: docs/nodes-geracao.md §3 (Qualidade 1K/2K/4K, Canvas 4).
--
-- Até aqui uma geração custava `ai_models.image_sparks` e ponto — o que estava
-- certo enquanto existia um tamanho só. A documentação oficial do Google, lida
-- em 10/08/2026, diz o seguinte:
--
--   gemini-3-pro-image      (Nano Banana Pro)  1K e 2K $0.134   ·  4K $0.24
--   gemini-3.1-flash-image  (Nano Banana 2)    1K $0.067  ·  2K $0.101  ·  4K $0.151
--
--   Fonte: ai.google.dev/gemini-api/docs/pricing e .../docs/image-generation
--
-- Ou seja: 4K custa quase o dobro de 2K no Pro, e no Flash cada degrau tem o seu
-- preço. Oferecer as três resoluções cobrando uma só seria dar 4K de presente ou
-- cobrar 4K por 1K — as duas coisas erradas ao mesmo tempo.
--
-- ---------------------------------------------------------------------------
-- Por que uma tabela, e não colunas
-- ---------------------------------------------------------------------------
--
-- `image_sparks_1k`, `image_sparks_4k`… resolveria hoje e teria que ser alterado
-- no dia em que um modelo publicar um tamanho que os outros não têm. Uma tabela
-- diz a mesma coisa sem prever quais serão os tamanhos.
--
-- E ela ganha um segundo papel, que é o mais importante: **é ela quem diz quais
-- resoluções um modelo oferece.** Não existe oferecer um tamanho que não se sabe
-- cobrar. A tela lê estas linhas para desabilitar as opções que o modelo não tem
-- — com o motivo à vista, porque a tela é o manual — e a função de cobrança lê
-- as mesmas linhas para decidir o preço. Uma fonte, dois leitores.
--
-- O que continua igual, e é a regra da casa: **o preço nunca vem de quem chama.**
-- O parâmetro novo de record_generation nomeia um *tamanho*, exatamente como
-- p_model_id nomeia um modelo; quanto isso custa continua sendo resposta do
-- catálogo. Um tamanho sem linha de preço é recusado (GN005), nunca cobrado pelo
-- preço-base — senão pedir 4K e pagar 2K seria possível.

-- ---------------------------------------------------------------------------
-- A tabela
-- ---------------------------------------------------------------------------

create table public.ai_model_image_prices (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ai_models (id) on delete cascade,
  image_size text not null,
  sparks integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint ai_model_image_prices_unique unique (model_id, image_size),
  constraint ai_model_image_prices_sparks_positive check (sparks > 0),
  -- O vocabulário é o da API do provedor, copiado da documentação dele — "1K",
  -- "2K", "4K". Sem lista fechada aqui de propósito: o dia em que um provedor
  -- publicar "8K" não deve exigir uma migration para mudar um CHECK, e sim uma
  -- linha nesta tabela. O formato é só o suficiente para barrar lixo.
  constraint ai_model_image_prices_size_format check (image_size ~ '^[A-Za-z0-9.]{1,16}$')
);

comment on table public.ai_model_image_prices is
  'Preço em Sparks de uma imagem, por resolução. É também a lista de resoluções '
  'que cada modelo oferece: não se oferece um tamanho que não se sabe cobrar. '
  'Lida por record_generation() para decidir o preço e pela tela para desabilitar '
  'as opções indisponíveis, com o motivo à vista. Irmã de ai_models.image_sparks, '
  'que continua sendo o preço de quem não nomeia tamanho.';

comment on column public.ai_model_image_prices.image_size is
  'O identificador de tamanho da API do provedor, verbatim da documentação dele '
  '— "1K", "2K", "4K". Nunca um nome que a gente inventou.';

comment on column public.ai_model_image_prices.sort_order is
  'Ordem no seletor de qualidade. Do menor para o maior, que é a ordem em que '
  'alguém pensa sobre resolução — e não a ordem alfabética, em que 4K vem antes '
  'de 1K.';

-- Índice de cobertura da FK, pela convenção de 20260807160000_index_foreign_keys.
-- model_id já é a coluna líder do unique acima, então não há índice separado.

-- ---------------------------------------------------------------------------
-- Só modelo de imagem tem preço de imagem
-- ---------------------------------------------------------------------------
--
-- O espelho de ai_models_image_price_matches_capability, que não cabe num CHECK
-- porque a capability mora na outra tabela. Uma linha de preço de imagem para um
-- modelo de extração não daria erro em lugar nenhum: ficaria lá, invisível, até o
-- dia em que alguém a lesse.

create or replace function public.enforce_image_price_capability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.ai_models m
     where m.id = new.model_id
       and 'image_gen' = any (m.capabilities)
  ) then
    raise exception 'image prices belong to models with the image_gen capability'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_image_price_capability() is
  'Recusa preço de imagem para modelo que não gera imagem. Espelho, entre tabelas, '
  'do CHECK ai_models_image_price_matches_capability.';

create trigger ai_model_image_prices_enforce_capability
  before insert or update of model_id on public.ai_model_image_prices
  for each row execute function public.enforce_image_price_capability();

-- Mesma razão de 20260807150000_revoke_trigger_function_execute.sql: o Supabase
-- concede EXECUTE em funções novas de `public` para os papéis da API, o que as
-- publica como endpoints /rest/v1/rpc. O Postgres recusa chamar uma trigger
-- function diretamente, mas a concessão está errada e o advisor aponta.
revoke execute on function public.enforce_image_price_capability()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS — a mesma do resto do catálogo
-- ---------------------------------------------------------------------------
--
-- Todo usuário autenticado lê; ninguém escreve. Não há nada de privado num preço
-- de tabela, e o seletor precisa dele para dizer o custo antes do clique. Sem
-- política de INSERT/UPDATE/DELETE, de propósito e pelo mesmo motivo das outras
-- duas tabelas do catálogo: nada que um usuário faça pode mudar o que uma imagem
-- custa.

alter table public.ai_model_image_prices enable row level security;

create policy ai_model_image_prices_select_all
  on public.ai_model_image_prices for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Os preços
-- ---------------------------------------------------------------------------
--
-- Regra da casa, a mesma dos seeds de 20260809140000: custo real em centavos de
-- BRL à taxa registrada (550 centavos por dólar, espelhando src/lib/ai/pricing.ts),
-- vezes 1,35 de margem, arredondado para o múltiplo de 5 mais próximo.
--
--   Nano Banana Pro   1K/2K  $0.134 -> 73,7c  -> 99,5   -> 100 ⚡
--                     4K     $0.24  -> 132,0c -> 178,2  -> 180 ⚡
--   Nano Banana 2     1K     $0.067 -> 36,9c  -> 49,7   ->  50 ⚡
--                     2K     $0.101 -> 55,6c  -> 75,0   ->  75 ⚡
--                     4K     $0.151 -> 83,1c  -> 112,1  -> 110 ⚡
--
-- Os dois preços de 2K são exatamente os que já estavam em ai_models.image_sparks.
-- Isso não é coincidência: 2K era o único tamanho que existia, e ninguém deve
-- pagar diferente amanhã pela mesma imagem que pediu ontem.
--
-- O 0.5K do Flash ($0.045) existe na API e **não** é semeado: a tela oferece
-- 1K/2K/4K, e um preço para um tamanho que ninguém pode pedir é um número que
-- ninguém jamais poderia conferir.
--
-- gpt-image-2 e grok-imagine-image-quality continuam sem linhas aqui, porque
-- continuam sem adapter. Eles mantêm image_sparks e seguem aparecendo cinza no
-- seletor — um preço por resolução que a gente não leu na documentação deles
-- seria um palpite, e um custo ausente é honesto enquanto um custo inventado não é.

insert into public.ai_model_image_prices (model_id, image_size, sparks, sort_order)
select m.id, p.image_size, p.sparks, p.sort_order
from public.ai_models m
join public.ai_providers pr on pr.id = m.provider_id
cross join (values
  ('1K', 100, 10),
  ('2K', 100, 20),
  ('4K', 180, 30)
) as p(image_size, sparks, sort_order)
where pr.slug = 'google' and m.slug = 'gemini-3-pro-image';

insert into public.ai_model_image_prices (model_id, image_size, sparks, sort_order)
select m.id, p.image_size, p.sparks, p.sort_order
from public.ai_models m
join public.ai_providers pr on pr.id = m.provider_id
cross join (values
  ('1K', 50, 10),
  ('2K', 75, 20),
  ('4K', 110, 30)
) as p(image_size, sparks, sort_order)
where pr.slug = 'google' and m.slug = 'gemini-3.1-flash-image';

-- ---------------------------------------------------------------------------
-- record_generation aprende a perguntar o preço do tamanho
-- ---------------------------------------------------------------------------
--
-- Mudar a lista de parâmetros é uma função nova no Postgres, não uma função
-- alterada — a identidade de uma função é o nome mais os tipos dos argumentos.
-- Então a assinatura antiga cai e as concessões são reemitidas contra a nova,
-- exatamente como em 20260809180000.
--
-- Códigos de erro, continuando a série da casa:
--
--   GN001  Sparks insuficientes para esta geração
--   GN002  personagem inexistente para este usuário (ou arquivada)
--   GN003  o modelo não é um modelo de imagem habilitado
--   GN004  projeto inexistente para este usuário
--   GN005  o modelo não tem preço para esse tamanho          <- novo

drop function if exists public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text
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
  p_image_size text default null
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
  v_generation public.generations;
begin
  if v_user_id is null then
    raise exception 'record_generation requires an authenticated session'
      using errcode = 'insufficient_privilege';
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

  -- Failure is free. Everything else pays the catalogue price.
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
    user_id, entity_id, model_id, provider, model, params,
    project_id, workflow_id, node_id,
    prompt_user_pt, prompt_compiled, status, input_tokens, output_tokens,
    cost_real_cents, cost_charged_cents, sparks_charged,
    result_asset_id, entity_version_id, sheet_source, summary, error_message,
    completed_at
  )
  values (
    v_user_id, p_entity_id, p_model_id, v_provider_slug, v_model_slug,
    coalesce(p_params, '{}'::jsonb),
    p_project_id, v_workflow_id, p_node_id,
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
  'Records one generation and, on success, debits the ledger for it — in a '
  'single transaction. The price is read from the catalogue and never accepted '
  'from the caller: ai_model_image_prices for the named image size, and '
  'ai_models.image_sparks when no size is named. Canvas generations also record '
  'where they came from (project, node) and what the user typed in Portuguese, '
  'which together with prompt_compiled is the bilingual audit trail of '
  'docs/nodes-geracao.md rule 2. The workflow is derived from the project, not '
  'accepted. Refuses with GN001 (insufficient balance), GN002 (character not '
  'found for this user), GN003 (model not an enabled image model), GN004 '
  '(project not found for this user) or GN005 (no price for this image size) so '
  'the interface can explain each case in plain words. Twin of '
  'public.record_extraction.';

-- ---------------------------------------------------------------------------
-- Concessões, reemitidas contra a assinatura nova
-- ---------------------------------------------------------------------------
--
-- Uma função removida leva as concessões dela junto, então isto não é repetição:
-- sem estas linhas a assinatura nova cairia no EXECUTE default que PUBLIC carrega
-- — que é exatamente o que o primeiro revoke existe para tirar.

revoke execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text, text
) from public, anon;

grant execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text, text
) to authenticated;
