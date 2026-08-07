-- Realtime for the two tables the canvas listens to: generation status and the
-- pulsing dot on each project tab.
--
-- Realtime honours RLS, so a subscriber only ever receives their own rows.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publication supabase_realtime not found, skipping';
    return;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'projects'
  ) then
    execute 'alter publication supabase_realtime add table public.projects';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'generations'
  ) then
    execute 'alter publication supabase_realtime add table public.generations';
  end if;
end;
$$;
