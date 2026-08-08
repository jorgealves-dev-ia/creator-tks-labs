-- Entity versioning: frozen snapshots of the character sheet over time.
--
-- Specification: docs/versionamento-entidades.md (approved 2026-08-07).
--
-- The model separates three things that must not live together:
--
--   * identity      -> public.entities        the handle, the display name, the owner
--   * frozen shots  -> public.entity_versions v1, v2, v3... never change once written
--   * living draft  -> public.entities.sheet  edited freely; "save as new version"
--                                             photographs it into entity_versions
--
-- @julia resolves to the active version through entities.active_version_id.
-- Rolling back is moving that pointer: nothing is erased, nothing is rewritten.
--
-- Design note on the append-only locks below. This migration follows the
-- precedent set by 20260807140400_ledger.sql: the lock protects against
-- rewriting history, NOT against a user's right to erase their own account
-- (LGPD). Every rejection trigger therefore lets the delete through when the
-- owning auth.users row is already gone, which is the signal that the delete is
-- a legitimate account cascade rather than someone editing the past.

-- ---------------------------------------------------------------------------
-- entity_versions
-- ---------------------------------------------------------------------------

create table public.entity_versions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version_number integer not null,
  sheet jsonb not null,
  label text,
  created_at timestamptz not null default now(),
  constraint entity_versions_version_number_positive check (version_number > 0),
  constraint entity_versions_sheet_is_object check (jsonb_typeof(sheet) = 'object'),
  constraint entity_versions_label_length
    check (label is null or length(btrim(label)) between 1 and 120),

  -- The sequential numbering guarantee. The BEFORE INSERT trigger computes the
  -- number under a row lock; this constraint is the safety net that makes two
  -- simultaneous saves incapable of both becoming "v3".
  constraint entity_versions_number_unique_per_entity unique (entity_id, version_number),

  -- Exists only so entities.active_version_id can point at (id, entity_id)
  -- instead of just (id). A composite foreign key needs a matching composite
  -- unique constraint on the referenced side. See the pointer below.
  constraint entity_versions_id_entity_id_unique unique (id, entity_id)
);

comment on table public.entity_versions is
  'Frozen snapshots of an entity character sheet. Append-only: a row is written '
  'once and never updated or deleted (see the triggers below). Rolling back is '
  'moving entities.active_version_id, never rewriting a row.';

comment on column public.entity_versions.sheet is
  'Complete snapshot of entities.sheet at save time — never a diff. Full '
  'snapshots are simpler to read, compare and restore, and they make a future '
  'visual diff between versions trivial to compute.';

comment on column public.entity_versions.version_number is
  'Sequential per entity, assigned by the database on INSERT. Never supplied by '
  'the application: see assign_entity_version_number().';

comment on column public.entity_versions.user_id is
  'Denormalised owner, same pattern as entity_images.user_id. Two reasons: RLS '
  'reads it directly instead of joining entities, and the delete trigger needs '
  'it to tell an account cascade apart from someone deleting a version — by the '
  'time a cascade reaches this row, the entities row is already gone.';

comment on column public.entity_versions.label is
  'Optional human tag, e.g. "v2 — cabelo mais curto".';

-- entity_id is already covered by entity_versions_number_unique_per_entity.
-- user_id is not, and an uncovered foreign key forces a sequential scan when the
-- parent is deleted — the problem 20260807160000_index_foreign_keys.sql fixed.
create index entity_versions_user_id_idx on public.entity_versions (user_id);

-- ---------------------------------------------------------------------------
-- Sequential numbering, race-proof (spec 4.2)
-- ---------------------------------------------------------------------------

create or replace function public.assign_entity_version_number()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Lock the entity row for the rest of the transaction. Two concurrent saves
  -- for the same entity serialise here: the second one only reads the maximum
  -- after the first has committed its row, so it sees v3 and asks for v4.
  -- Locking the entity (not the versions) also works for the very first save,
  -- when there is no version row to lock yet.
  perform 1 from public.entities where id = new.entity_id for update;

  select coalesce(max(version_number), 0) + 1
    into new.version_number
    from public.entity_versions
   where entity_id = new.entity_id;

  return new;
end;
$$;

comment on function public.assign_entity_version_number() is
  'Assigns the next version_number per entity. Always overrides whatever the '
  'caller passed: numbering is the database''s job, not the application''s.';

create trigger entity_versions_assign_number
  before insert on public.entity_versions
  for each row execute function public.assign_entity_version_number();

-- ---------------------------------------------------------------------------
-- Append-only enforcement (spec 4.1)
-- ---------------------------------------------------------------------------

create or replace function public.reject_entity_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Unconditional, with no account-cascade exception: deleting an account never
  -- produces an UPDATE on this table, so there is no legitimate case to let
  -- through. Same shape as reject_ledger_update().
  raise exception
    'entity_versions is append-only: a saved version is a frozen snapshot — save a new version instead of editing this one'
    using errcode = 'restrict_violation';
end;
$$;

create trigger entity_versions_reject_update
  before update on public.entity_versions
  for each row execute function public.reject_entity_version_update();

create or replace function public.reject_entity_version_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Erasing the account must still work. During that cascade the auth.users row
  -- is already gone by the time this fires, which is the signal that the delete
  -- is a legitimate erasure rather than someone rewriting history. This is why
  -- the row carries its own user_id: the entities row has already been removed
  -- at this point, so it cannot be consulted.
  --
  -- security definer because `authenticated` cannot read auth.users.
  if not exists (select 1 from auth.users where id = old.user_id) then
    return old;
  end if;

  raise exception
    'entity_versions is append-only: a saved version can never be deleted — archive the entity instead'
    using errcode = 'restrict_violation';
end;
$$;

comment on function public.reject_entity_version_delete() is
  'Blocks every delete except the account-erasure cascade. Deleting an entity '
  'that has versions therefore fails too, which is the database enforcing the '
  'spec rule that entities are archived, never physically deleted.';

create trigger entity_versions_reject_delete
  before delete on public.entity_versions
  for each row execute function public.reject_entity_version_delete();

-- ---------------------------------------------------------------------------
-- entities: the active-version pointer and archiving
-- ---------------------------------------------------------------------------

alter table public.entities
  add column active_version_id uuid,
  add column archived_at timestamptz;

-- The pointer integrity guarantee. A plain FK on (active_version_id) would let
-- a bug point @julia at a version of @carla. Referencing the composite
-- (id, entity_id) makes the database itself refuse that: the version must
-- belong to this very entity.
--
-- MATCH SIMPLE (the default) is what makes a nullable pointer work: when
-- active_version_id is null the constraint is not enforced, which is exactly the
-- state of a freshly created entity that still has only a draft.
--
-- ON DELETE CASCADE rather than RESTRICT: a version is only ever deleted during
-- account erasure, and the sibling cascades from auth.users have no guaranteed
-- order. With RESTRICT, erasure would abort whenever entity_versions happened to
-- be processed before entities.
alter table public.entities
  add constraint entities_active_version_belongs_to_entity
  foreign key (active_version_id, id)
  references public.entity_versions (id, entity_id)
  on delete cascade;

comment on column public.entities.active_version_id is
  'The version @handle resolves to. Null while the entity has only a draft — '
  'and an entity with a null pointer cannot be mentioned with @ at all.';

comment on column public.entities.archived_at is
  'Archived entities are hidden from lists and blocked from new generations and '
  'mentions, but everything is preserved. Entities are archived, never deleted.';

comment on column public.entities.sheet is
  'The living draft. Edited freely; "save as new version" copies it into '
  'entity_versions. Generations may run from the draft, but they are recorded '
  'as generations.sheet_source = draft, and @ mentions never resolve to it.';

-- Superseded by entity_versions.version_number. Left in place deliberately:
-- dropping a column is not reversible and nothing reads it yet. It is scheduled
-- for removal in a future migration.
comment on column public.entities.version is
  'DEPRECATED — superseded by entity_versions.version_number and '
  'entities.active_version_id. Do not read or write it. Scheduled for removal.';

create index entities_active_version_id_idx
  on public.entities (active_version_id)
  where active_version_id is not null;

-- ---------------------------------------------------------------------------
-- generations: which snapshot produced this image
-- ---------------------------------------------------------------------------

alter table public.generations
  add column entity_version_id uuid references public.entity_versions (id) on delete set null,
  add column sheet_source text;

alter table public.generations
  add constraint generations_sheet_source_valid
  check (sheet_source is null or sheet_source in ('version', 'draft'));

comment on column public.generations.entity_version_id is
  'Which frozen snapshot was used. Together with prompt_compiled this closes the '
  'audit loop: an image from months ago can always answer "who was Julia when '
  'you were born?".';

comment on column public.generations.sheet_source is
  'Set whenever an entity took part in the generation. `version` means a frozen '
  'snapshot; `draft` means the living draft — allowed, but flagged in the '
  'history as not reproducible.';

create index generations_entity_version_id_idx
  on public.generations (entity_version_id)
  where entity_version_id is not null;

-- ---------------------------------------------------------------------------
-- Canonical images referenced by a version are immortal (spec 4.3)
-- ---------------------------------------------------------------------------

create or replace function public.reject_canonical_entity_image_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Same account-erasure exception as the other locks in this project.
  if not exists (select 1 from auth.users where id = old.user_id) then
    return old;
  end if;

  -- The sheet stores canonical images as a flat object of role -> asset id, for
  -- example {"turnaround_frente": "b3f2...", "folha_expressoes": null}. The ids
  -- are asset ids: entity_images has a composite primary key and no id column of
  -- its own, so there is nothing else they could be.
  --
  -- The spec says "any row of entity_versions", not "any version of this
  -- entity", so the search is deliberately not scoped by entity_id: an asset
  -- shared with another character must not disappear either. That means a scan
  -- of entity_versions on every image delete, which is acceptable at this scale
  -- and is the honest reading of the rule.
  --
  -- jsonb_typeof guards the sheets that predate this block or were written
  -- without it — jsonb_each_text raises on anything that is not an object.
  if exists (
    select 1
    from public.entity_versions ev
    where jsonb_typeof(ev.sheet -> 'imagens_canonicas') = 'object'
      and exists (
        select 1
        from jsonb_each_text(ev.sheet -> 'imagens_canonicas')
          as canonical(image_role, asset_ref)
        where canonical.asset_ref = old.asset_id::text
      )
  ) then
    raise exception
      'this image is referenced by a saved entity version and cannot be deleted: deleting it would break a frozen snapshot'
      using errcode = 'restrict_violation';
  end if;

  return old;
end;
$$;

comment on function public.reject_canonical_entity_image_delete() is
  'Protects images that a frozen version depends on. An image referenced only by '
  'the living draft stays deletable — the draft is meant to change.';

create trigger entity_images_reject_canonical_delete
  before delete on public.entity_images
  for each row execute function public.reject_canonical_entity_image_delete();

-- ---------------------------------------------------------------------------
-- RLS (spec 4.4)
-- ---------------------------------------------------------------------------

alter table public.entity_versions enable row level security;

create policy entity_versions_select_own
  on public.entity_versions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy entity_versions_insert_own
  on public.entity_versions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- No UPDATE and no DELETE policy, on purpose. The triggers above already refuse
-- both even for the service role; leaving the policies out stops the attempt one
-- layer earlier, and makes the intent obvious to anyone reading the schema.

revoke all on public.entity_versions from anon;

-- ---------------------------------------------------------------------------
-- Keep the new trigger functions off the REST surface
-- ---------------------------------------------------------------------------
--
-- Supabase grants EXECUTE on new functions in `public` to anon and authenticated
-- by default, which publishes them as /rest/v1/rpc endpoints. Postgres refuses
-- to run a trigger function called directly, but the grant is still wrong and
-- the security advisor flags it. Revoking from `public` is what actually closes
-- it — the API roles inherit the default grant through the PUBLIC pseudo-role.
-- Same reasoning as 20260807150000_revoke_trigger_function_execute.sql.

revoke execute on function public.assign_entity_version_number() from public, anon, authenticated;
revoke execute on function public.reject_entity_version_update() from public, anon, authenticated;
revoke execute on function public.reject_entity_version_delete() from public, anon, authenticated;
revoke execute on function public.reject_canonical_entity_image_delete() from public, anon, authenticated;
