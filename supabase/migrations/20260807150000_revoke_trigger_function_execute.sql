-- Take EXECUTE away from the API roles on every trigger function.
--
-- Supabase grants EXECUTE on new functions in `public` to anon and
-- authenticated by default, which publishes these as /rest/v1/rpc/… endpoints.
-- Postgres refuses to run a trigger function called directly, so nothing was
-- exploitable, but the grant is still wrong and the security advisor flags it.
--
-- Safe for the triggers themselves: Postgres checks EXECUTE when the trigger is
-- created, not each time it fires.
--
-- Revoking from `public` as well is what actually closes it — anon and
-- authenticated inherit the default grant through the PUBLIC pseudo-role.

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_default_workflow() from public, anon, authenticated;
revoke execute on function public.reject_ledger_update() from public, anon, authenticated;
revoke execute on function public.reject_ledger_delete() from public, anon, authenticated;
revoke execute on function public.apply_ledger_transaction() from public, anon, authenticated;
