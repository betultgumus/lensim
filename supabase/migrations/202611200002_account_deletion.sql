-- Lensim · cloud backup withdrawal and real account deletion (Google Play account deletion requirement).
--
-- 1) delete_lensim_cloud_data(): the signed-in person deletes their cloud backup and its archived history but keeps
--    the account (used when cloud backup is turned off with "buluttaki kopyayı sil").
-- 2) delete_my_lensim_account(): deletes the backup, its history AND the auth.users row. Supabase removes the
--    account's identities, sessions and refresh tokens together with auth.users. The function checks that nothing
--    is left and raises an error otherwise, so the app only reports success when the deletion really finished.
--
-- Both only ever act on auth.uid(); no user can delete another user's rows.

drop policy if exists "Users can delete their own Lensim backup" on public.user_backups;
create policy "Users can delete their own Lensim backup"
  on public.user_backups for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own Lensim backup history" on public.user_backup_history;
create policy "Users can delete their own Lensim backup history"
  on public.user_backup_history for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.delete_lensim_cloud_data()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  removed_backups integer;
  removed_history integer;
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;
  delete from public.user_backup_history where user_id = current_user_id;
  get diagnostics removed_history = row_count;
  delete from public.user_backups where user_id = current_user_id;
  get diagnostics removed_backups = row_count;
  if exists (select 1 from public.user_backups where user_id = current_user_id)
     or exists (select 1 from public.user_backup_history where user_id = current_user_id) then
    raise exception 'cloud_deletion_incomplete';
  end if;
  return jsonb_build_object('backups', removed_backups, 'history', removed_history);
end;
$$;

revoke all on function public.delete_lensim_cloud_data() from public, anon;
grant execute on function public.delete_lensim_cloud_data() to authenticated;

-- security definer: a signed-in user cannot delete from auth.users directly. The function is limited to auth.uid().
create or replace function public.delete_my_lensim_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;
  delete from public.user_backup_history where user_id = current_user_id;
  delete from public.user_backups where user_id = current_user_id;
  delete from auth.users where id = current_user_id;
  if exists (select 1 from auth.users where id = current_user_id)
     or exists (select 1 from public.user_backups where user_id = current_user_id)
     or exists (select 1 from public.user_backup_history where user_id = current_user_id) then
    raise exception 'account_deletion_incomplete';
  end if;
  return true;
end;
$$;

revoke all on function public.delete_my_lensim_account() from public, anon;
grant execute on function public.delete_my_lensim_account() to authenticated;
