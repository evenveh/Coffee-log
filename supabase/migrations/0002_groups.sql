-- =====================================================================
-- Coffee Log: groups, so friends can see each other's brews
-- Run once in Supabase dashboard -> SQL Editor, after 0001_init.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. GROUPS: a set of people who see each other's brews.
--    You create one, others join with its invite code.
--    For now a user is in at most one group (unique user_id below).
-- ---------------------------------------------------------------------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  invite_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  unique (user_id) -- one group per user
);


-- ---------------------------------------------------------------------
-- 2. HELPERS used by the policies below.
--    "security definer" lets them read group_members without going through
--    group_members' own policy, which would otherwise call itself forever.
-- ---------------------------------------------------------------------

-- The caller's group, or null.
create function public.my_group_id()
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select group_id from public.group_members where user_id = (select auth.uid())
$$;

-- True if `other` is in the same group as the caller.
create function public.in_my_group(other uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members me
    join public.group_members them on them.group_id = me.group_id
    where me.user_id = (select auth.uid()) and them.user_id = other
  )
$$;


-- ---------------------------------------------------------------------
-- 3. CREATE / JOIN: the only ways into a group. There is no insert policy
--    on group_members, so you can't add yourself without the invite code.
--    Error messages are shown in the app as-is.
-- ---------------------------------------------------------------------
create function public.create_group(group_name text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if trim(coalesce(group_name, '')) = '' then raise exception 'Give the group a name.'; end if;
  if exists (select 1 from public.group_members where user_id = uid) then
    raise exception 'You are already in a group. Leave it first (in Settings).';
  end if;

  insert into public.groups (name, created_by) values (trim(group_name), uid) returning id into gid;
  insert into public.group_members (group_id, user_id) values (gid, uid);
  return gid;
end;
$$;

create function public.join_group(code text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  current_gid uuid;
begin
  if uid is null then raise exception 'Sign in first.'; end if;

  select id into gid from public.groups where invite_code = lower(trim(code));
  if gid is null then raise exception 'No group has that invite code. Check it and try again.'; end if;

  select group_id into current_gid from public.group_members where user_id = uid;
  if current_gid = gid then return gid; end if; -- already a member: nothing to do
  if current_gid is not null then
    raise exception 'You are already in a group. Leave it first (in Settings).';
  end if;

  insert into public.group_members (group_id, user_id) values (gid, uid);
  return gid;
end;
$$;


-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- You see your own group and its members. Leaving = deleting your own row.
create policy "groups: read own group" on public.groups for select to authenticated
  using (id = (select public.my_group_id()));

create policy "group_members: read own group" on public.group_members for select to authenticated
  using (group_id = (select public.my_group_id()));
create policy "group_members: leave" on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- Brews: you can READ your own and your group's, but only WRITE your own.
-- (Postgres policies are per command, so the old "for all" policy becomes four.)
drop policy "brews: own only" on public.brews;

create policy "brews: read own and group" on public.brews for select to authenticated
  using (user_id = (select auth.uid()) or public.in_my_group(user_id));
create policy "brews: insert own" on public.brews for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "brews: update own" on public.brews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "brews: delete own" on public.brews for delete to authenticated
  using (user_id = (select auth.uid()));

-- brew_photos and the storage bucket are unchanged: photos stay private.


-- ---------------------------------------------------------------------
-- 5. PERMISSIONS. Supabase grants everything on new tables and functions to
--    anon and authenticated by default, so narrow it down explicitly.
-- ---------------------------------------------------------------------
revoke all on public.groups, public.group_members from anon, authenticated;
grant select on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;

revoke execute on function public.my_group_id(), public.in_my_group(uuid),
  public.create_group(text), public.join_group(text) from public, anon;
grant execute on function public.my_group_id(), public.in_my_group(uuid),
  public.create_group(text), public.join_group(text) to authenticated;
