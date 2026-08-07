-- Append-only credit ledger. The wallet balance is derived from it.

create type public.ledger_kind as enum (
  'deposit',
  'debit',
  'refund',
  'adjustment'
);

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.ledger_kind not null,
  amount_cents integer not null,
  cost_real_cents integer,
  cost_charged_cents integer,
  generation_id uuid references public.generations (id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  constraint ledger_transactions_amount_not_zero check (amount_cents <> 0),
  constraint ledger_transactions_amount_sign_matches_kind check (
    (kind in ('deposit', 'refund') and amount_cents > 0)
    or (kind = 'debit' and amount_cents < 0)
    or (kind = 'adjustment')
  ),
  constraint ledger_transactions_costs_non_negative check (
    coalesce(cost_real_cents, 0) >= 0 and coalesce(cost_charged_cents, 0) >= 0
  )
);

comment on table public.ledger_transactions is
  'Append-only money log, in BRL cents. Never UPDATE or DELETE a row: a '
  'correction is a new reversal transaction. Enforced by trigger below, so the '
  'rule holds even for the service role.';

comment on column public.ledger_transactions.amount_cents is
  'Signed: positive credits the wallet, negative debits it.';

create index ledger_transactions_user_id_created_at_idx
  on public.ledger_transactions (user_id, created_at desc);

create index ledger_transactions_generation_id_idx
  on public.ledger_transactions (generation_id)
  where generation_id is not null;

-- ---------------------------------------------------------------------------
-- Append-only enforcement
-- ---------------------------------------------------------------------------

create or replace function public.reject_ledger_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception
    'ledger_transactions is append-only: record a reversal transaction instead of updating'
    using errcode = 'restrict_violation';
end;
$$;

create trigger ledger_transactions_reject_update
  before update on public.ledger_transactions
  for each row execute function public.reject_ledger_update();

create or replace function public.reject_ledger_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Deleting the account must still work. During that cascade the auth.users
  -- row is already gone by the time this fires, which is the signal that the
  -- delete is legitimate rather than someone rewriting history.
  if not exists (select 1 from auth.users where id = old.user_id) then
    return old;
  end if;

  raise exception
    'ledger_transactions is append-only: record a reversal transaction instead of deleting'
    using errcode = 'restrict_violation';
end;
$$;

create trigger ledger_transactions_reject_delete
  before delete on public.ledger_transactions
  for each row execute function public.reject_ledger_delete();

-- ---------------------------------------------------------------------------
-- The wallet balance is a projection of the ledger
-- ---------------------------------------------------------------------------

create or replace function public.apply_ledger_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.wallets
     set balance_cents = balance_cents + new.amount_cents
   where user_id = new.user_id;

  if not found then
    raise exception 'no wallet for user %', new.user_id
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

comment on function public.apply_ledger_transaction() is
  'Keeps wallets.balance_cents in sync with the ledger. An overdraft trips the '
  'wallets_balance_cents_non_negative constraint and aborts the transaction, '
  'so the ledger row is never written either.';

create trigger ledger_transactions_apply_to_wallet
  after insert on public.ledger_transactions
  for each row execute function public.apply_ledger_transaction();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ledger_transactions enable row level security;

create policy ledger_transactions_select_own
  on public.ledger_transactions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Read-only for the signed-in user: entries are written by server-side code
-- with the service role, next to the generation that caused them.

revoke all on public.ledger_transactions from anon;
