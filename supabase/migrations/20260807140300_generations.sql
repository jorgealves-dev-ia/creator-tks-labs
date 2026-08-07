-- Generations: one row per model execution, with its cost and compiled prompt.

create type public.generation_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled'
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  workflow_id uuid references public.workflows (id) on delete set null,
  node_id text,
  provider text not null,
  model text not null,
  params jsonb not null default '{}'::jsonb,
  prompt_user_pt text,
  prompt_compiled jsonb,
  status public.generation_status not null default 'queued',
  provider_job_id text,
  cost_real_cents integer not null default 0,
  cost_charged_cents integer not null default 0,
  result_asset_id uuid references public.assets (id) on delete set null,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generations_costs_non_negative
    check (cost_real_cents >= 0 and cost_charged_cents >= 0),
  constraint generations_provider_not_blank check (length(btrim(provider)) > 0),
  constraint generations_model_not_blank check (length(btrim(model)) > 0)
);

comment on table public.generations is
  'One model execution. Generation is always asynchronous: a server route '
  'creates the row as queued, the provider webhook updates it, and Realtime '
  'pushes the status to the canvas.';

comment on column public.generations.node_id is
  'Id of the originating node inside workflows.graph (React Flow node id).';

comment on column public.generations.prompt_compiled is
  'The English JSON recipe compiled from prompt_user_pt. Shown, and editable, '
  'in the result node.';

comment on column public.generations.cost_real_cents is
  'What the provider charged, in BRL cents.';

comment on column public.generations.cost_charged_cents is
  'What was debited from the user, in BRL cents. Equal to cost_real_cents '
  'today; carries the margin later.';

create index generations_user_id_created_at_idx
  on public.generations (user_id, created_at desc);

create index generations_project_id_status_idx
  on public.generations (project_id, status);

create index generations_provider_job_id_idx
  on public.generations (provider, provider_job_id)
  where provider_job_id is not null;

create trigger generations_set_updated_at
  before update on public.generations
  for each row execute function public.set_updated_at();

alter table public.generations enable row level security;

create policy generations_select_own
  on public.generations for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Deliberately read-only for the signed-in user. Creating a generation must go
-- through the server route that checks the wallet balance and writes the
-- ledger entry; webhooks then update status and costs. Both run with the
-- service role, which bypasses RLS.

revoke all on public.generations from anon;
