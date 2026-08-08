-- Saving a character version, atomically.
--
-- Specification: docs/tela-character-sheet.md §3.3 and §8, and
-- docs/versionamento-entidades.md rule 5.1.
--
-- Why this is a database function and not an API route.
--
-- "Save as new version" is two writes that must be one: INSERT the frozen
-- snapshot into entity_versions, then move entities.active_version_id onto it.
-- The Supabase client cannot open a transaction, so an API route would issue two
-- separate round trips — and a failure between them would leave either an
-- orphaned version or, worse, @handle resolving to the wrong snapshot. A
-- plpgsql function called over RPC runs inside one transaction: both writes land
-- or neither does. Same principle as the rest of this schema — the guarantee
-- lives in the database, not in code that has to remember it.
--
-- The snapshot is read from entities.sheet rather than sent by the browser: a
-- version is a photograph of the draft, so the draft is the only thing it can
-- possibly be a photograph of. The interface flushes its pending autosave before
-- calling this.
--
-- security invoker, so RLS still decides what the caller may touch. The
-- function can therefore only ever version a character its caller owns.

-- ---------------------------------------------------------------------------
-- Custom error codes
-- ---------------------------------------------------------------------------
--
-- Postgres reserves SQLSTATE classes beginning with 0-4 and A-H, so these use a
-- private class. PostgREST passes the code through to the client, which is what
-- lets the interface tell "nothing changed" apart from a real failure and show
-- the honest message for each.
--
--   CT001  the draft is identical to the active version — nothing to freeze
--   CT002  the character is archived
--   CT003  no such character for this user

create or replace function public.save_entity_version(
  p_entity_id uuid,
  p_label text default null
)
returns public.entity_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entity public.entities%rowtype;
  v_active_sheet jsonb;
  v_version public.entity_versions%rowtype;
begin
  -- Locks the character for the rest of the transaction, so two clicks on
  -- "save as new version" cannot both read the same "nothing changed" answer.
  -- The numbering trigger locks this same row, which is harmless: re-locking
  -- inside one transaction never waits.
  select * into v_entity
    from public.entities
   where id = p_entity_id
     for update;

  if not found then
    raise exception 'character not found'
      using errcode = 'CT003';
  end if;

  if v_entity.archived_at is not null then
    raise exception 'an archived character cannot gain new versions'
      using errcode = 'CT002';
  end if;

  if v_entity.active_version_id is not null then
    select ev.sheet into v_active_sheet
      from public.entity_versions ev
     where ev.id = v_entity.active_version_id;

    -- jsonb equality compares content, not key order, which is exactly the
    -- comparison the interface's disabled button is promising.
    if v_active_sheet is not distinct from v_entity.sheet then
      raise exception 'the draft is identical to the active version'
        using errcode = 'CT001';
    end if;
  end if;

  -- version_number is assigned by the BEFORE INSERT trigger under a row lock;
  -- the zero here is a placeholder it overwrites. Numbering is the database's
  -- job, never the caller's.
  insert into public.entity_versions (entity_id, user_id, version_number, sheet, label)
  values (
    p_entity_id,
    v_entity.user_id,
    0,
    v_entity.sheet,
    nullif(btrim(coalesce(p_label, '')), '')
  )
  returning * into v_version;

  -- Rule 5.1: a freshly saved version becomes the active one automatically.
  update public.entities
     set active_version_id = v_version.id
   where id = p_entity_id;

  return v_version;
end;
$$;

comment on function public.save_entity_version(uuid, text) is
  'Freezes entities.sheet into a new entity_versions row and moves the active '
  'version pointer onto it, in one transaction. Raises CT001 when the draft '
  'already matches the active version, CT002 when the character is archived and '
  'CT003 when it does not exist for the caller.';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
--
-- Unlike the trigger functions of 20260807150000, this one is meant to be called
-- over /rest/v1/rpc — but only by a signed-in user. Revoking from PUBLIC first
-- is what actually removes the default grant, since anon and authenticated
-- inherit it through the PUBLIC pseudo-role.

revoke execute on function public.save_entity_version(uuid, text) from public, anon;
grant execute on function public.save_entity_version(uuid, text) to authenticated;
