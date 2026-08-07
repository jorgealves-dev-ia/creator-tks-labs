-- Projects (the tabs at the top of the canvas) and their workflow graph.

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create type public.project_status as enum (
  'idle',
  'generating',
  'generated',
  'error'
);

comment on type public.project_status is
  'Aggregated status shown as the pulsing dot on the project tab.';

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  status public.project_status not null default 'idle',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_length check (length(btrim(name)) between 1 and 80)
);

comment on table public.projects is
  'A workspace tab. Each project owns exactly one workflow.';

create index projects_user_id_sort_order_idx
  on public.projects (user_id, sort_order, created_at);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy projects_select_own
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy projects_insert_own
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy projects_update_own
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy projects_delete_own
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.projects from anon;

-- ---------------------------------------------------------------------------
-- workflows — the React Flow graph, one row per project
-- ---------------------------------------------------------------------------

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  graph jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflows_version_positive check (version > 0)
);

comment on table public.workflows is
  'Canvas graph in React Flow shape: { nodes, edges, viewport }. `version` '
  'increments on every save and is used for optimistic concurrency.';

create index workflows_user_id_idx on public.workflows (user_id);

create trigger workflows_set_updated_at
  before update on public.workflows
  for each row execute function public.set_updated_at();

alter table public.workflows enable row level security;

create policy workflows_select_own
  on public.workflows for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy workflows_insert_own
  on public.workflows for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy workflows_update_own
  on public.workflows for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy workflows_delete_own
  on public.workflows for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.workflows from anon;

-- ---------------------------------------------------------------------------
-- Invariant: every project has a workflow from the moment it is created
-- ---------------------------------------------------------------------------

create or replace function public.create_default_workflow()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.workflows (project_id, user_id)
  values (new.id, new.user_id)
  on conflict (project_id) do nothing;

  return new;
end;
$$;

comment on function public.create_default_workflow() is
  'Guarantees the 1:1 project/workflow invariant without relying on app code.';

create trigger projects_create_default_workflow
  after insert on public.projects
  for each row execute function public.create_default_workflow();
