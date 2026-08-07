-- Assets (files in Storage) and entities (the objects mentionable with @).

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------

create type public.asset_kind as enum ('image', 'video', 'audio');
create type public.asset_source as enum ('upload', 'generation');

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.asset_kind not null,
  source public.asset_source not null,
  storage_bucket text not null default 'assets',
  storage_path text not null,
  mime_type text not null,
  byte_size bigint,
  width integer,
  height integer,
  duration_ms integer,
  created_at timestamptz not null default now(),
  constraint assets_storage_object_unique unique (storage_bucket, storage_path),
  constraint assets_storage_path_not_blank check (length(btrim(storage_path)) > 0)
);

comment on table public.assets is
  'Every file lives in Supabase Storage. Provider URLs expire, so results are '
  'copied here immediately and an external URL is never the source of truth.';

create index assets_user_id_created_at_idx
  on public.assets (user_id, created_at desc);

alter table public.assets enable row level security;

create policy assets_select_own
  on public.assets for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy assets_insert_own
  on public.assets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy assets_delete_own
  on public.assets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No UPDATE policy: an asset row describes an immutable stored file.

revoke all on public.assets from anon;

-- ---------------------------------------------------------------------------
-- entities — reusable objects referenced in prompts as @handle
-- ---------------------------------------------------------------------------

create type public.entity_kind as enum (
  'character',
  'product',
  'scene',
  'outfit',
  'accessory'
);

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind public.entity_kind not null,
  handle text not null,
  display_name text not null,
  sheet jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  cover_asset_id uuid references public.assets (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entities_handle_format check (handle ~ '^[a-z0-9][a-z0-9_-]{0,47}$'),
  constraint entities_handle_unique_per_user unique (user_id, handle),
  constraint entities_display_name_length
    check (length(btrim(display_name)) between 1 and 120),
  constraint entities_version_positive check (version > 0)
);

comment on table public.entities is
  'Mentionable with @handle. `sheet` holds the structured character sheet. '
  'A null project_id means the entity is available in all of the user''s '
  'projects; a set project_id scopes it to that project.';

comment on column public.entities.handle is
  'Lowercase slug typed after @ in a prompt field, e.g. "julia".';

create index entities_user_id_kind_idx on public.entities (user_id, kind);
create index entities_project_id_idx on public.entities (project_id);

create trigger entities_set_updated_at
  before update on public.entities
  for each row execute function public.set_updated_at();

alter table public.entities enable row level security;

create policy entities_select_own
  on public.entities for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy entities_insert_own
  on public.entities for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy entities_update_own
  on public.entities for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy entities_delete_own
  on public.entities for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.entities from anon;

-- ---------------------------------------------------------------------------
-- entity_images — the canonical images of an entity (turnaround, expressions)
-- ---------------------------------------------------------------------------

create table public.entity_images (
  entity_id uuid not null references public.entities (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (entity_id, asset_id)
);

comment on table public.entity_images is
  'Join table for the canonical images of an entity. Exists because an entity '
  'has many of them (turnaround, expressions) and each must keep referential '
  'integrity with assets.';

comment on column public.entity_images.role is
  'Optional label for the image, e.g. "turnaround-front", "expression-smile".';

create index entity_images_entity_id_sort_order_idx
  on public.entity_images (entity_id, sort_order);

alter table public.entity_images enable row level security;

create policy entity_images_select_own
  on public.entity_images for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy entity_images_insert_own
  on public.entity_images for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy entity_images_update_own
  on public.entity_images for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy entity_images_delete_own
  on public.entity_images for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.entity_images from anon;
