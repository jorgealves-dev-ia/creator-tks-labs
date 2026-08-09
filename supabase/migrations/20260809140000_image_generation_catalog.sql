-- Image generation: the `image_gen` capability, its prices, and the charging
-- function that is the twin of record_extraction.
--
-- Specification: docs/geracao-canonica.md §4.1 (decisions G1-G4).
--
-- Three things happen here, and they belong together because the third depends
-- on the first two:
--
--   1. the catalogue learns to price an image  -> ai_models.image_sparks
--   2. the catalogue learns which models make  -> capability `image_gen`, seeded
--      them, and what each really costs           for Google, OpenAI and xAI
--   3. public.generations grows into the shape -> model_id, entity_id, tokens,
--      that public.extractions proved, and         sparks_charged, summary…
--      gains record_generation()                   and the atomic debit
--
-- Model identifiers and prices below were read from each provider's official
-- documentation on 2026-08-09, not from memory. Sources:
--   Google  ai.google.dev/gemini-api/docs/pricing
--   OpenAI  developers.openai.com/api/docs/models
--   xAI     docs.x.ai/developers/models

-- ---------------------------------------------------------------------------
-- The price of an image (spec 4.1)
-- ---------------------------------------------------------------------------

alter table public.ai_models
  add column image_sparks integer;

comment on column public.ai_models.image_sparks is
  'Price in Sparks for one generated image. Read by record_generation() from '
  'this column and never from the caller — the same rule that makes the price '
  'of an extraction a property of the catalogue and not of whoever calls the '
  'API. Sibling of extraction_sparks in every respect.';

alter table public.ai_models
  add constraint ai_models_image_sparks_positive
  check (image_sparks is null or image_sparks > 0);

-- Same shape as ai_models_extraction_price_matches_capability: a model that can
-- generate images must have a price, and one that cannot must not carry one.
-- Without it, a mispriced row would either give images away or offer a model
-- the charging function cannot price — and an image costs real money per click.
alter table public.ai_models
  add constraint ai_models_image_price_matches_capability check (
    ('image_gen' = any (capabilities)) = (image_sparks is not null)
  );

-- ---------------------------------------------------------------------------
-- The Google key: the name the official documentation uses
-- ---------------------------------------------------------------------------
--
-- Seeded as GOOGLE_AI_API_KEY on 2026-08-08, when no adapter existed to read it.
-- Every official Google sample calls it GEMINI_API_KEY, and so does every
-- tutorial anyone will ever follow. Aligning now costs one line; leaving it
-- divergent would cost a confused hour every time a key has to be set again.

update public.ai_providers
   set env_var_name = 'GEMINI_API_KEY'
 where slug = 'google';

-- ---------------------------------------------------------------------------
-- Seeds (spec 4.1 / decision G2)
-- ---------------------------------------------------------------------------
--
-- Google is the only one with an adapter in this phase. OpenAI and xAI are
-- seeded now so the catalogue already knows the road ahead: the selector shows
-- them greyed out as "(em breve)", which is the honest state the extraction
-- selector already speaks.
--
-- Spark prices are the house rule: real cost in BRL cents at the recorded
-- exchange rate (550 cents per USD, mirroring src/lib/ai/pricing.ts), times
-- 1.35 for margin, rounded to the nearest 5. Every one of them is an educated
-- guess whose job is to be replaced by data — which is exactly what
-- generations.real_cost_cents is being recorded for.
--
--   gemini-3-pro-image          $0.134/image (1K and 2K cost the same) ->  74c -> 100 ⚡
--   gemini-3.1-flash-image      $0.101/image at 2K                     ->  56c ->  75 ⚡
--   gpt-image-2                 $0.17/image, high quality, square      ->  94c -> 125 ⚡
--   grok-imagine-image-quality  $0.07/image at 2K                      ->  39c ->  55 ⚡

insert into public.ai_models
  (provider_id, slug, display_name, capabilities, image_sparks, is_default, sort_order)
select
  p.id, m.slug, m.display_name, m.capabilities, m.image_sparks, m.is_default, m.sort_order
from public.ai_providers p
cross join (values
  -- Decision G2: the model a professional consistency workflow reaches for.
  ('gemini-3-pro-image', 'Nano Banana Pro', array['image_gen'], 100, true, 40),
  ('gemini-3.1-flash-image', 'Nano Banana 2', array['image_gen'], 75, false, 50)
) as m(slug, display_name, capabilities, image_sparks, is_default, sort_order)
where p.slug = 'google';

insert into public.ai_models
  (provider_id, slug, display_name, capabilities, image_sparks, is_default, sort_order)
select
  p.id, m.slug, m.display_name, m.capabilities, m.image_sparks, m.is_default, m.sort_order
from public.ai_providers p
cross join (values
  ('gpt-image-2', 'GPT Image 2', array['image_gen'], 125, false, 40)
) as m(slug, display_name, capabilities, image_sparks, is_default, sort_order)
where p.slug = 'openai';

insert into public.ai_models
  (provider_id, slug, display_name, capabilities, image_sparks, is_default, sort_order)
select
  p.id, m.slug, m.display_name, m.capabilities, m.image_sparks, m.is_default, m.sort_order
from public.ai_providers p
cross join (values
  ('grok-imagine-image-quality', 'Grok Imagine', array['image_gen'], 55, false, 40)
) as m(slug, display_name, capabilities, image_sparks, is_default, sort_order)
where p.slug = 'xai';

-- ---------------------------------------------------------------------------
-- generations grows into the shape extractions proved (spec 4.1)
-- ---------------------------------------------------------------------------
--
-- The table was designed in Phase 0 for the asynchronous canvas flow and has
-- never held a row. What it lacked was everything that makes extractions
-- auditable: which catalogue model ran, for which character, what it consumed,
-- and what the user actually paid in the unit they see.
--
-- What is deliberately NOT duplicated: cost_real_cents already means exactly
-- what extractions.real_cost_cents means, and cost_charged_cents already holds
-- the same figure the ledger receives. Adding a second pair of columns for the
-- same two numbers would create the possibility of them disagreeing.

alter table public.generations
  add column model_id uuid references public.ai_models (id) on delete restrict,
  add column entity_id uuid references public.entities (id) on delete cascade,
  add column input_tokens integer,
  add column output_tokens integer,
  add column sparks_charged integer not null default 0,
  add column summary jsonb;

-- `error` and `error_message` are the same idea under two names, and two names
-- for one idea is how a query ends up missing half the failures. Renamed rather
-- than duplicated; the table is empty, so nothing is being rewritten.
alter table public.generations
  rename column error to error_message;

comment on column public.generations.model_id is
  'The catalogue row that ran, and therefore the row that decided the price. '
  'The legacy provider/model text columns are still written, from this row, so '
  'a generation stays readable even if a catalogue entry is later retired.';

comment on column public.generations.entity_id is
  'The character this generation belongs to. Set for canonical images; null for '
  'a generation that came from a canvas node without a character.';

comment on column public.generations.sparks_charged is
  'What the user paid, in Sparks — the unit shown on screen. cost_charged_cents '
  'holds the same amount in BRL cents, which is what the ledger speaks.';

comment on column public.generations.summary is
  'What the interface has to be able to say afterwards: which slot was filled, '
  'which outfit was used, and whether the §5.22 fallback had to be applied.';

comment on column public.generations.error_message is
  'The provider''s own words about what went wrong, verbatim. Never our summary '
  'of them: a message we wrote ourselves can only repeat what we assumed.';

alter table public.generations
  add constraint generations_tokens_non_negative check (
    coalesce(input_tokens, 0) >= 0 and coalesce(output_tokens, 0) >= 0
  );

alter table public.generations
  add constraint generations_sparks_charged_non_negative check (sparks_charged >= 0);

-- A failed generation is nobody's bill — the rule extractions already enforces.
alter table public.generations
  add constraint generations_failed_is_free check (
    status = 'succeeded' or sparks_charged = 0
  );

alter table public.generations
  add constraint generations_summary_is_object check (
    summary is null or jsonb_typeof(summary) = 'object'
  );

create index generations_entity_id_created_at_idx
  on public.generations (entity_id, created_at desc)
  where entity_id is not null;

create index generations_model_id_idx
  on public.generations (model_id)
  where model_id is not null;

-- ---------------------------------------------------------------------------
-- Recording a generation and charging for it, atomically (spec 4.1)
-- ---------------------------------------------------------------------------
--
-- The twin of public.record_extraction, and for the same reasons: writing the
-- row and debiting the ledger are two writes that have to be one, the Supabase
-- client cannot open a transaction, and a price the caller could name is a price
-- the caller could set to zero.
--
-- security definer because the ledger is read-only for `authenticated` by
-- design. Making this a database function rather than application code holding
-- the service-role key means the whole feature needs no service-role key at all.
--
-- Custom error codes in the house style — CT001-003 for versions, EX001-003 for
-- extractions, and now:
--
--   GN001  not enough Sparks for this generation
--   GN002  no such character for this user (or it is archived)
--   GN003  the model is not an enabled image-generation model

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
  p_error_message text default null
)
returns public.generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sparks integer;
  v_charged integer;
  v_charged_cents integer;
  v_balance integer;
  v_handle text;
  v_provider_slug text;
  v_model_slug text;
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
    prompt_compiled, status, input_tokens, output_tokens,
    cost_real_cents, cost_charged_cents, sparks_charged,
    result_asset_id, entity_version_id, sheet_source, summary, error_message,
    completed_at
  )
  values (
    v_user_id, p_entity_id, p_model_id, v_provider_slug, v_model_slug,
    coalesce(p_params, '{}'::jsonb),
    p_prompt_compiled, p_status, p_input_tokens, p_output_tokens,
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
        when v_handle is null then 'Geração de imagem'
        else 'Imagem canônica de @' || v_handle
      end
    );
  end if;

  return v_generation;
end;
$$;

comment on function public.record_generation is
  'Records one generation and, on success, debits the ledger for it — in a '
  'single transaction. The price is read from ai_models.image_sparks, never '
  'accepted from the caller. Refuses with GN001 (insufficient balance), GN002 '
  '(character not found for this user) or GN003 (model not an enabled image '
  'model) so the interface can explain each case in plain words. Twin of '
  'public.record_extraction.';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
--
-- generations already refuses INSERT to `authenticated` (no policy exists, by
-- design since Phase 0), so this function is the only way a row is ever written
-- — which is what makes it the only thing that can decide a price.
--
-- Revoking from PUBLIC first is what actually removes the default grant, since
-- anon and authenticated inherit it through the PUBLIC pseudo-role. Same shape
-- as the grants of record_extraction.

revoke execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text
) from public, anon;

grant execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text
) to authenticated;
