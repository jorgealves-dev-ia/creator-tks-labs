-- AI provider catalogue and the extraction log.
--
-- Specification: docs/motor-extracao.md (decisions E1-E6, approved 2026-08-08).
--
-- Two things are created together, on purpose:
--
--   * the catalogue  -> public.ai_providers / public.ai_models
--                       every provider and model the product will ever offer,
--                       for extraction now and image/video generation later
--   * the log        -> public.extractions
--                       one row per extraction attempt: what it read, what it
--                       cost us, what we charged, and the resulting tally
--
-- Decision E5 draws the line that matters here: the catalogue lives in the
-- database (it is what the future super-admin panel will manage), but the secret
-- API key never does. A key lives only in a server environment variable; the
-- catalogue merely records *which* variable holds it, and "configured" is
-- computed on the server as the mere existence of that variable. Nothing in this
-- schema can leak a credential, because no column ever holds one.

-- ---------------------------------------------------------------------------
-- ai_providers (spec 3.1)
-- ---------------------------------------------------------------------------

create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  display_name text not null,
  env_var_name text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint ai_providers_slug_unique unique (slug),
  constraint ai_providers_slug_format check (slug ~ '^[a-z0-9][a-z0-9_-]{0,47}$'),
  -- Uppercase with underscores: the shape of every environment variable name in
  -- this project. The constraint exists because this value is looked up against
  -- process.env on the server, and a malformed name would silently read nothing.
  constraint ai_providers_env_var_name_format check (env_var_name ~ '^[A-Z][A-Z0-9_]{2,63}$')
);

comment on table public.ai_providers is
  'Catalogue of AI providers. Decision E1: multi-provider from birth, Anthropic '
  'first. A provider with no key is still listed — the interface shows it greyed '
  'out rather than hiding it, so the user can see what exists.';

comment on column public.ai_providers.env_var_name is
  'Which server environment variable holds this provider''s secret key. The key '
  'itself is NEVER stored here or anywhere else in the database (decision E5). '
  'Whether a provider is configured is derived on the server from the existence '
  'of this variable and travels to the browser as a boolean.';

comment on column public.ai_providers.enabled is
  'Governance, not configuration: turns a provider off for the whole product '
  'even when its key exists. Distinct from "configured".';

comment on column public.ai_providers.sort_order is
  'Display order in the model selector. Not in the specification table, but a '
  'selector needs a stable order and alphabetical would bury Anthropic.';

-- ---------------------------------------------------------------------------
-- ai_models (spec 3.2)
-- ---------------------------------------------------------------------------

create table public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ai_providers (id) on delete cascade,
  slug text not null,
  display_name text not null,
  capabilities text[] not null default '{}',
  extraction_sparks integer,
  is_default boolean not null default false,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint ai_models_slug_unique_per_provider unique (provider_id, slug),
  constraint ai_models_extraction_sparks_positive
    check (extraction_sparks is null or extraction_sparks > 0),
  -- A model that can extract must have a price, and a model that cannot must not
  -- carry one. Without this, a mispriced catalogue row would either give away
  -- extractions for free or offer a model the charging function cannot price.
  constraint ai_models_extraction_price_matches_capability check (
    ('extraction' = any (capabilities)) = (extraction_sparks is not null)
  )
);

comment on table public.ai_models is
  'Catalogue of models, one row per model per provider. `capabilities` is what '
  'makes this one table serve the whole product: {extraction} today, {image_gen} '
  'and {video_gen} when generation arrives.';

comment on column public.ai_models.slug is
  'The official model identifier in the provider''s API, copied verbatim from '
  'their documentation — e.g. claude-sonnet-5. Never a name we invented.';

comment on column public.ai_models.extraction_sparks is
  'Price in Sparks for one extraction. Read by record_extraction() from this '
  'column and never from the caller, so the price of an extraction is decided by '
  'the catalogue and not by whoever calls the API.';

comment on column public.ai_models.is_default is
  'Pre-selected in the selector. Advisory only: the application picks the first '
  'default among the configured providers.';

-- Covering index for the foreign key, per the convention established in
-- 20260807160000_index_foreign_keys.sql. Deleting a provider must not force a
-- sequential scan of the models table.
-- (provider_id alone is already the leading column of the unique constraint
-- above, so no separate index is needed here.)

-- ---------------------------------------------------------------------------
-- extractions (spec 4.4) — the engine's logbook
-- ---------------------------------------------------------------------------

create type public.extraction_source as enum ('photo', 'text');
create type public.extraction_status as enum ('succeeded', 'failed');

create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_id uuid not null references public.entities (id) on delete cascade,
  model_id uuid not null references public.ai_models (id) on delete restrict,
  source public.extraction_source not null,
  status public.extraction_status not null,
  input_tokens integer,
  output_tokens integer,
  real_cost_cents integer,
  sparks_charged integer not null default 0,
  reference_asset_id uuid references public.assets (id) on delete set null,
  source_text text,
  summary jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint extractions_tokens_non_negative check (
    coalesce(input_tokens, 0) >= 0 and coalesce(output_tokens, 0) >= 0
  ),
  constraint extractions_real_cost_non_negative check (
    real_cost_cents is null or real_cost_cents >= 0
  ),
  -- Never negative. A negative charge would become a positive ledger amount and
  -- turn a debit into a credit — the one arithmetic mistake this table could
  -- make that gives money away.
  constraint extractions_sparks_charged_non_negative check (sparks_charged >= 0),
  -- Rule of spec 4.4: an API failure is nobody's bill.
  constraint extractions_failed_is_free check (
    status = 'succeeded' or sparks_charged = 0
  ),
  constraint extractions_source_text_not_blank check (
    source_text is null or length(btrim(source_text)) > 0
  ),
  constraint extractions_summary_is_object check (
    summary is null or jsonb_typeof(summary) = 'object'
  )
);

comment on table public.extractions is
  'One row per extraction attempt — the engine''s logbook and the raw material '
  'for calibrating the Spark price against real cost. Also the reading source of '
  'the future super-admin dashboard, which is why real cost and tokens are '
  'recorded even for attempts that charged nothing.';

comment on column public.extractions.real_cost_cents is
  'What the extraction actually cost us, in BRL cents: provider token prices '
  'times tokens consumed, converted at an approximate exchange rate recorded in '
  'src/lib/ai/pricing.ts. Cent precision is enough — the purpose is calibration, '
  'not accounting.';

comment on column public.extractions.sparks_charged is
  'What the user paid, in Sparks. Zero on failure (constraint above) and zero '
  'whenever the catalogue price is zero.';

comment on column public.extractions.reference_asset_id is
  'The photo that was read (source = photo). Auditable on purpose: months later '
  'it answers "what did the engine actually look at?". Null for source = text.';

comment on column public.extractions.source_text is
  'The pasted text (source = text) — decision E6, a character sheet imported '
  'from another platform. Kept for the same auditability as the photo.';

comment on column public.extractions.summary is
  'The tally shown on screen: observados / inferidos / vazios / preservados.';

create index extractions_user_id_created_at_idx
  on public.extractions (user_id, created_at desc);

create index extractions_entity_id_idx on public.extractions (entity_id);
create index extractions_model_id_idx on public.extractions (model_id);

create index extractions_reference_asset_id_idx
  on public.extractions (reference_asset_id)
  where reference_asset_id is not null;

-- ---------------------------------------------------------------------------
-- The ledger learns to point at an extraction
-- ---------------------------------------------------------------------------

alter table public.ledger_transactions
  add column extraction_id uuid references public.extractions (id) on delete set null;

comment on column public.ledger_transactions.extraction_id is
  'Which extraction caused this transaction, mirroring generation_id. Without it '
  'a debit and its extraction could never be reconciled, and the admin dashboard '
  'could not answer "what did we charge for this analysis?".';

create index ledger_transactions_extraction_id_idx
  on public.ledger_transactions (extraction_id)
  where extraction_id is not null;

-- ---------------------------------------------------------------------------
-- The Spark rate, in the one place the database can read it
-- ---------------------------------------------------------------------------
--
-- CENTS_PER_SPARK lives in src/lib/sparks/index.ts for the application. The
-- charging function below needs the same number and cannot import TypeScript, so
-- it is restated here — immutable, and marked as the mirror it is rather than
-- duplicated inline at three call sites.

create or replace function public.cents_per_spark()
returns integer
language sql
immutable
set search_path = ''
as $$ select 1 $$;

comment on function public.cents_per_spark() is
  'BRL cents per Spark. Mirrors CENTS_PER_SPARK in src/lib/sparks/index.ts — '
  'change both together. Money is always accounted in cents; Sparks are display.';

-- ---------------------------------------------------------------------------
-- Recording an extraction and charging for it, atomically (spec 4.4)
-- ---------------------------------------------------------------------------
--
-- Writing the extraction row and debiting the ledger are two writes that have to
-- be one. Same reasoning as public.save_entity_version: the Supabase client does
-- not open transactions, so two round trips would leave either a charge with no
-- record of what it paid for, or a record of a paid extraction that was never
-- charged. Both are wrong in a way the user would eventually notice.
--
-- security definer because the ledger is read-only for `authenticated` by
-- design — writing it is server-side work. Making that server-side work a
-- database function instead of application code holding the service-role key
-- means this whole feature needs no service-role key at all: the function is the
-- only thing that can write a debit, it decides the price itself, and it refuses
-- to act for anyone but the owner of the character.
--
-- The price comes from the catalogue, never from the caller. That is the reason
-- the function takes a model id rather than an amount: a caller who could name
-- its own price could name zero.
--
-- Custom error codes, in the same private SQLSTATE class as CT001-CT003 of
-- 20260807190000_save_entity_version.sql. PostgREST passes the code through, so
-- the interface can say the honest sentence for each case:
--
--   EX001  not enough Sparks for this extraction
--   EX002  no such character for this user (or it is archived)
--   EX003  the model is not an enabled extraction model

create or replace function public.record_extraction(
  p_entity_id uuid,
  p_model_id uuid,
  p_source public.extraction_source,
  p_status public.extraction_status,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_real_cost_cents integer default null,
  p_reference_asset_id uuid default null,
  p_source_text text default null,
  p_summary jsonb default null,
  p_error_message text default null
)
returns public.extractions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sparks integer;
  v_charged integer;
  v_balance integer;
  v_handle text;
  v_extraction public.extractions;
begin
  if v_user_id is null then
    raise exception 'record_extraction requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  -- The character must exist, belong to the caller and not be archived. Checked
  -- here rather than trusted from the application because security definer means
  -- RLS is not doing it for us any more.
  select e.handle into v_handle
    from public.entities e
   where e.id = p_entity_id
     and e.user_id = v_user_id
     and e.archived_at is null;

  if v_handle is null then
    raise exception 'character not found for this user'
      using errcode = 'EX002';
  end if;

  -- The price is the catalogue's answer, and the model has to actually be an
  -- extraction model that is switched on — for itself and for its provider.
  select m.extraction_sparks into v_sparks
    from public.ai_models m
    join public.ai_providers p on p.id = m.provider_id
   where m.id = p_model_id
     and m.enabled
     and p.enabled
     and 'extraction' = any (m.capabilities);

  if v_sparks is null then
    raise exception 'model is not an enabled extraction model'
      using errcode = 'EX003';
  end if;

  -- Failure is free (spec 4.4). Everything else pays the catalogue price.
  v_charged := case when p_status = 'succeeded' then v_sparks else 0 end;

  if v_charged > 0 then
    select w.balance_cents into v_balance
      from public.wallets w
     where w.user_id = v_user_id
       for update;

    -- The wallet constraint would abort the transaction anyway; checking first
    -- only buys a code the interface can turn into a sentence instead of a
    -- database error. The row is locked above so the check and the debit cannot
    -- be separated by another transaction.
    if coalesce(v_balance, 0) < v_charged * public.cents_per_spark() then
      raise exception 'insufficient balance for this extraction'
        using errcode = 'EX001';
    end if;
  end if;

  insert into public.extractions (
    user_id, entity_id, model_id, source, status,
    input_tokens, output_tokens, real_cost_cents, sparks_charged,
    reference_asset_id, source_text, summary, error_message
  )
  values (
    v_user_id, p_entity_id, p_model_id, p_source, p_status,
    p_input_tokens, p_output_tokens, p_real_cost_cents, v_charged,
    p_reference_asset_id, p_source_text, p_summary, p_error_message
  )
  returning * into v_extraction;

  if v_charged > 0 then
    -- The legitimate ledger path, unchanged: a signed row whose insert trigger
    -- projects the new balance onto the wallet. cost_real_cents and
    -- cost_charged_cents are the same two columns every generation fills in, so
    -- the margin of the future monetisation phase lives in their difference here
    -- exactly as it does there.
    insert into public.ledger_transactions (
      user_id, kind, amount_cents, cost_real_cents, cost_charged_cents,
      extraction_id, description
    )
    values (
      v_user_id,
      'debit',
      -(v_charged * public.cents_per_spark()),
      p_real_cost_cents,
      v_charged * public.cents_per_spark(),
      v_extraction.id,
      'Extração de personagem @' || v_handle
    );
  end if;

  return v_extraction;
end;
$$;

comment on function public.record_extraction is
  'Records one extraction and, on success, debits the ledger for it — in a '
  'single transaction. The price is read from ai_models.extraction_sparks, never '
  'accepted from the caller. Refuses with EX001 (insufficient balance), EX002 '
  '(character not found for this user) or EX003 (model not an enabled extraction '
  'model) so the interface can explain each case in plain words.';

-- ---------------------------------------------------------------------------
-- RLS (spec 3.3 and 4.4)
-- ---------------------------------------------------------------------------

alter table public.ai_providers enable row level security;
alter table public.ai_models enable row level security;
alter table public.extractions enable row level security;

-- The selector has to read the catalogue, so every signed-in user may read it.
-- There is nothing private in it: names, prices and which environment variable
-- holds a key — never a key.
create policy ai_providers_select_all
  on public.ai_providers for select
  to authenticated
  using (true);

create policy ai_models_select_all
  on public.ai_models for select
  to authenticated
  using (true);

-- No INSERT, UPDATE or DELETE policy on either catalogue table, on purpose
-- (spec 3.3): in this phase the catalogue is managed by direct SQL, and later by
-- the admin panel. Nothing a user does can change what a model costs.

create policy extractions_select_own
  on public.extractions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT policy either: rows are written only by record_extraction(), which
-- is the only thing that may decide a price and touch the ledger.

revoke all on public.ai_providers from anon;
revoke all on public.ai_models from anon;
revoke all on public.extractions from anon;

-- record_extraction is meant to be called over /rest/v1/rpc, but only by a
-- signed-in user: revoking from PUBLIC first is what actually removes the default
-- grant, since anon and authenticated inherit it through the PUBLIC pseudo-role.
-- Same shape as the grants of 20260807190000_save_entity_version.sql.
revoke execute on function public.record_extraction(
  uuid, uuid, public.extraction_source, public.extraction_status,
  integer, integer, integer, uuid, text, jsonb, text
) from public, anon;

grant execute on function public.record_extraction(
  uuid, uuid, public.extraction_source, public.extraction_status,
  integer, integer, integer, uuid, text, jsonb, text
) to authenticated;

-- cents_per_spark is an internal helper of the function above and has no
-- business being a REST endpoint of its own. record_extraction is security
-- definer, so it keeps calling it as the owner regardless of this revoke.
revoke execute on function public.cents_per_spark() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed (spec 3.2)
-- ---------------------------------------------------------------------------
--
-- Model identifiers and prices below were read from Anthropic's official model
-- documentation on 2026-08-08, not from memory. Every current Claude model
-- accepts image input, which is what makes them usable for photo extraction.
--
-- Only Anthropic is born configured. OpenAI, Google and xAI are listed and
-- enabled but have no key, so the server reports them as not configured and the
-- selector greys them out with a tooltip — the user sees the road ahead instead
-- of a suspiciously short list.
--
-- Their model identifiers below are placeholders and were NOT verified against
-- each provider's documentation: no adapter can reach them, so nothing reads the
-- string yet. Re-check each one against the official documentation in the same
-- session that writes its adapter — the same rule that produced the verified
-- Anthropic identifiers above.

insert into public.ai_providers (slug, display_name, env_var_name, sort_order)
values
  ('anthropic', 'Anthropic', 'ANTHROPIC_API_KEY', 10),
  ('openai', 'OpenAI', 'OPENAI_API_KEY', 20),
  ('google', 'Google', 'GOOGLE_AI_API_KEY', 30),
  ('xai', 'xAI', 'XAI_API_KEY', 40);

-- Anthropic. Sonnet is the default: best cost-benefit for reading a face.
-- 10 Sparks is the specification's educated guess, deliberately kept — the whole
-- point of public.extractions is to replace it with a number backed by data.
insert into public.ai_models
  (provider_id, slug, display_name, capabilities, extraction_sparks, is_default, sort_order)
select
  p.id, m.slug, m.display_name, m.capabilities, m.extraction_sparks, m.is_default, m.sort_order
from public.ai_providers p
cross join (values
  ('claude-sonnet-5', 'Claude Sonnet', array['extraction'], 10, true, 10),
  ('claude-opus-5', 'Claude Opus', array['extraction'], 30, false, 20),
  ('claude-haiku-4-5', 'Claude Haiku', array['extraction'], 4, false, 30)
) as m(slug, display_name, capabilities, extraction_sparks, is_default, sort_order)
where p.slug = 'anthropic';

insert into public.ai_models
  (provider_id, slug, display_name, capabilities, extraction_sparks, is_default, sort_order)
select
  p.id, m.slug, m.display_name, m.capabilities, m.extraction_sparks, m.is_default, m.sort_order
from public.ai_providers p
cross join (values
  ('gpt-5', 'GPT-5', array['extraction'], 10, false, 10),
  ('gpt-5-mini', 'GPT-5 mini', array['extraction'], 4, false, 20)
) as m(slug, display_name, capabilities, extraction_sparks, is_default, sort_order)
where p.slug = 'openai';

insert into public.ai_models
  (provider_id, slug, display_name, capabilities, extraction_sparks, is_default, sort_order)
select
  p.id, m.slug, m.display_name, m.capabilities, m.extraction_sparks, m.is_default, m.sort_order
from public.ai_providers p
cross join (values
  ('gemini-2.5-pro', 'Gemini 2.5 Pro', array['extraction'], 10, false, 10),
  ('gemini-2.5-flash', 'Gemini 2.5 Flash', array['extraction'], 4, false, 20)
) as m(slug, display_name, capabilities, extraction_sparks, is_default, sort_order)
where p.slug = 'google';

insert into public.ai_models
  (provider_id, slug, display_name, capabilities, extraction_sparks, is_default, sort_order)
select
  p.id, m.slug, m.display_name, m.capabilities, m.extraction_sparks, m.is_default, m.sort_order
from public.ai_providers p
cross join (values
  ('grok-4', 'Grok 4', array['extraction'], 10, false, 10)
) as m(slug, display_name, capabilities, extraction_sparks, is_default, sort_order)
where p.slug = 'xai';
