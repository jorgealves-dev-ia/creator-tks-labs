-- record_generation learns where a canvas generation came from, and what the
-- user actually typed.
--
-- Specification: docs/nodes-geracao.md §6, rules 2 and 4.
--
-- Nothing new is invented here. `generations` has carried prompt_user_pt,
-- project_id, workflow_id and node_id since Phase 0 — they were designed for
-- exactly this moment and have been null ever since, because the only writer of
-- the table (record_generation) had no way to receive them.
--
-- Why not carry them inside params jsonb, which already exists and would need no
-- migration: because they are already columns that mean precisely this, and a
-- second place holding the same fact is how a query ends up missing half its
-- rows. The same reasoning that renamed `error` to `error_message` instead of
-- adding a sibling.
--
-- Three parameters arrive, not four. The workflow is *derived* from the project
-- rather than accepted: one project owns exactly one workflow (invariant since
-- Phase 0, enforced by a unique constraint), so a caller naming both could only
-- ever introduce the possibility of them disagreeing.
--
-- Changing the parameter list means a new function in Postgres, not a modified
-- one — a function's identity is its name plus its argument types. So the old
-- signature is dropped and the grants are re-issued against the new one.

-- ---------------------------------------------------------------------------
-- Out with the 13-argument signature
-- ---------------------------------------------------------------------------

drop function if exists public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text
);

-- ---------------------------------------------------------------------------
-- In with the same function, plus provenance
-- ---------------------------------------------------------------------------
--
-- Error codes, continuing the house series:
--
--   GN001  not enough Sparks for this generation
--   GN002  no such character for this user (or it is archived)
--   GN003  the model is not an enabled image-generation model
--   GN004  no such project for this user            <- new

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
  p_node_id text default null
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
  'single transaction. The price is read from ai_models.image_sparks, never '
  'accepted from the caller. Canvas generations also record where they came '
  'from (project, node) and what the user typed in Portuguese, which together '
  'with prompt_compiled is the bilingual audit trail of docs/nodes-geracao.md '
  'rule 2. The workflow is derived from the project, not accepted. Refuses '
  'with GN001 (insufficient balance), GN002 (character not found for this '
  'user), GN003 (model not an enabled image model) or GN004 (project not found '
  'for this user) so the interface can explain each case in plain words. Twin '
  'of public.record_extraction.';

-- ---------------------------------------------------------------------------
-- Grants, re-issued against the new signature
-- ---------------------------------------------------------------------------
--
-- A dropped function takes its grants with it, so these are not a repetition:
-- without them the new signature would fall back to the default EXECUTE grant
-- that PUBLIC carries, which is exactly what the first revoke exists to remove.

revoke execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text
) from public, anon;

grant execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text
) to authenticated;
