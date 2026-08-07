-- Core foundation: shared trigger helper, user profile and wallet.
--
-- Security model used by every migration in this project:
--   * Row Level Security is enabled on every table.
--   * With RLS enabled and no matching policy, Postgres denies the operation.
--     That is the default-deny baseline; each policy below opens exactly one
--     operation, for exactly the owning user.
--   * Privileges are revoked from `anon`: nothing in this product is public.
--   * `service_role` bypasses RLS and is used only by server-side code.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- `set search_path = ''` forces fully qualified names inside the function body,
-- which prevents search_path hijacking (flagged by Supabase security advisors).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: stamps updated_at on every UPDATE.';

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application-facing user data. Created automatically on sign-up.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT policy: rows are created by the sign-up trigger below.
-- No DELETE policy: the row is removed by cascade when the account is deleted.

revoke all on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- wallets — balance in BRL cents, one per user
-- ---------------------------------------------------------------------------

create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_balance_cents_non_negative check (balance_cents >= 0)
);

comment on table public.wallets is
  'Credit balance in BRL cents. Sparks are a display unit only. The balance is '
  'never written directly: it is maintained by the ledger_transactions trigger.';

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

alter table public.wallets enable row level security;

create policy wallets_select_own
  on public.wallets for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Read-only for the user on purpose: the balance changes only through the
-- ledger, which is written by server-side code.

revoke all on public.wallets from anon;

-- ---------------------------------------------------------------------------
-- Sign-up: create the profile and the wallet
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the profile and the (zero balance) wallet for a new account.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
