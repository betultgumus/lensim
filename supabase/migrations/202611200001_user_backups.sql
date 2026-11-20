create table if not exists public.user_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_backup_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  revision bigint not null,
  archived_at timestamptz not null default now()
);

alter table public.user_backups enable row level security;
alter table public.user_backup_history enable row level security;

drop policy if exists "Users can read their own Lensim backup" on public.user_backups;
create policy "Users can read their own Lensim backup"
  on public.user_backups for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own Lensim backup" on public.user_backups;
create policy "Users can insert their own Lensim backup"
  on public.user_backups for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Lensim backup" on public.user_backups;
create policy "Users can update their own Lensim backup"
  on public.user_backups for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own Lensim backup history" on public.user_backup_history;
create policy "Users can read their own Lensim backup history"
  on public.user_backup_history for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can append their own Lensim backup history" on public.user_backup_history;
create policy "Users can append their own Lensim backup history"
  on public.user_backup_history for insert to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.save_lensim_backup(
  p_snapshot jsonb,
  p_expected_revision bigint,
  p_archive_previous boolean default false
) returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_row public.user_backups%rowtype;
  saved_revision bigint;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;
  if jsonb_typeof(p_snapshot) <> 'object' or (p_snapshot->>'version') is null then
    raise exception 'invalid_lensim_snapshot';
  end if;

  select * into current_row
    from public.user_backups
    where user_id = current_user_id
    for update;

  if not found then
    if p_expected_revision <> 0 then raise exception 'backup_revision_conflict'; end if;
    insert into public.user_backups(user_id, snapshot, revision)
      values (current_user_id, p_snapshot, 1)
      returning revision into saved_revision;
    return saved_revision;
  end if;

  if current_row.revision <> p_expected_revision then
    raise exception 'backup_revision_conflict';
  end if;

  if p_archive_previous then
    insert into public.user_backup_history(user_id, snapshot, revision)
      values (current_user_id, current_row.snapshot, current_row.revision);
  end if;

  update public.user_backups
    set snapshot = p_snapshot, revision = current_row.revision + 1, updated_at = now()
    where user_id = current_user_id
    returning revision into saved_revision;
  return saved_revision;
end;
$$;

revoke all on function public.save_lensim_backup(jsonb, bigint, boolean) from public, anon;
grant execute on function public.save_lensim_backup(jsonb, bigint, boolean) to authenticated;
