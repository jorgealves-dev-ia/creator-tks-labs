-- Private Storage bucket for every generated or uploaded file.
--
-- Path convention: <user_id>/<...>. The first folder segment is the owner, and
-- the policies below rely on it.

insert into storage.buckets (id, name, "public", file_size_limit)
values (
  'assets',
  'assets',
  false,
  52428800 -- 50 MB, the Supabase Free plan cap. Raise it when the plan changes.
)
on conflict (id) do nothing;

create policy assets_objects_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'assets'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy assets_objects_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'assets'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy assets_objects_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'assets'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'assets'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy assets_objects_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'assets'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
