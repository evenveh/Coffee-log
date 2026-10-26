-- =====================================================================
-- Coffee Log: beans, milks, grinders and brewers are shared per group
-- Run once in Supabase dashboard -> SQL Editor, after 0005_brewers_grants.sql.
--
-- Before: every signed-in user saw and edited every row.
-- After: each row belongs to a group (group_id), or, for someone without a
-- group, to its creator alone. Rows used by a brew you can see stay readable,
-- so old brews keep their bean and milk names after you leave a group.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. WHICH LIST A ROW IS IN. The default fills in the creator's group, the
--    same way created_by defaults to auth.uid(). Null = a private row.
--    If a group were ever deleted, its rows would become their creators' again.
-- ---------------------------------------------------------------------
alter table public.beans    add column group_id uuid references public.groups (id) on delete set null default public.my_group_id();
alter table public.milks    add column group_id uuid references public.groups (id) on delete set null default public.my_group_id();
alter table public.grinders add column group_id uuid references public.groups (id) on delete set null default public.my_group_id();
alter table public.brewers  add column group_id uuid references public.groups (id) on delete set null default public.my_group_id();


-- ---------------------------------------------------------------------
-- 2. BACKFILL existing rows into their creator's current group.
--    Creators without a group keep their rows as private rows.
-- ---------------------------------------------------------------------
update public.beans    t set group_id = m.group_id from public.group_members m where m.user_id = t.created_by;
update public.milks    t set group_id = m.group_id from public.group_members m where m.user_id = t.created_by;
update public.grinders t set group_id = m.group_id from public.group_members m where m.user_id = t.created_by;
update public.brewers  t set group_id = m.group_id from public.group_members m where m.user_id = t.created_by;

-- Rows with no creator (the seeded brewers) go to the only group there is.
-- If there were several groups, the subquery would fail with "more than one
-- row returned", which stops the whole migration instead of guessing.
update public.brewers set group_id = (select id from public.groups) where created_by is null;


-- ---------------------------------------------------------------------
-- 3. NAMES ARE UNIQUE PER LIST, not across the whole app. Otherwise two groups
--    couldn't both have "Oat", and the error would reveal the other group's list.
--    coalesce(group_id, created_by) = the list's owner: the group, or you.
--    The app shows error 23505 as "That name is already in the list."
-- ---------------------------------------------------------------------
alter table public.milks    drop constraint milks_name_key;
alter table public.grinders drop constraint grinders_name_key;
alter table public.brewers  drop constraint brewers_name_key;

create unique index milks_list_name_key    on public.milks    (coalesce(group_id, created_by), name);
create unique index grinders_list_name_key on public.grinders (coalesce(group_id, created_by), name);
create unique index brewers_list_name_key  on public.brewers  (coalesce(group_id, created_by), name);

-- The read policies below look up brews by these columns, so index them.
create index brews_bean_id_idx    on public.brews (bean_id);
create index brews_milk_id_idx    on public.brews (milk_id);
create index brews_grinder_id_idx on public.brews (grinder_id);
create index brews_brewer_id_idx  on public.brews (brewer_id);


-- ---------------------------------------------------------------------
-- 4. HELPERS
-- ---------------------------------------------------------------------

-- True if a row is in the caller's list: their group's row, or, for a private
-- row, one they created. Not security definer: it only reads the row's own values.
create function public.is_in_my_list(row_group uuid, row_creator uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when row_group is null then row_creator = (select auth.uid())
    else row_group = (select public.my_group_id())
  end
$$;

-- "Computed fields": a function that takes a table's row shows up in the API as
-- an extra column, so the app can ask for `in_my_list` like any other column.
-- Lists show only these rows; the others are readable only because a brew uses them.
create function public.in_my_list(public.beans) returns boolean language sql stable set search_path = ''
  as $$ select public.is_in_my_list($1.group_id, $1.created_by) $$;
create function public.in_my_list(public.milks) returns boolean language sql stable set search_path = ''
  as $$ select public.is_in_my_list($1.group_id, $1.created_by) $$;
create function public.in_my_list(public.grinders) returns boolean language sql stable set search_path = ''
  as $$ select public.is_in_my_list($1.group_id, $1.created_by) $$;
create function public.in_my_list(public.brewers) returns boolean language sql stable set search_path = ''
  as $$ select public.is_in_my_list($1.group_id, $1.created_by) $$;

-- Moves a user's private rows into a group. Called by create_group and join_group.
-- A private name the group already has (both have "Oat") stays private, and old
-- brews keep showing it through the "used by a brew" rule below.
-- Security definer skips RLS, so only those two functions may call it (section 7):
-- otherwise anyone could move someone else's rows into their own group.
create function public.move_private_rows(uid uuid, gid uuid)
returns void
language sql
security definer set search_path = ''
as $$
  update public.beans set group_id = gid where created_by = uid and group_id is null;
  update public.milks t set group_id = gid where t.created_by = uid and t.group_id is null
    and not exists (select 1 from public.milks g where g.group_id = gid and g.name = t.name);
  update public.grinders t set group_id = gid where t.created_by = uid and t.group_id is null
    and not exists (select 1 from public.grinders g where g.group_id = gid and g.name = t.name);
  update public.brewers t set group_id = gid where t.created_by = uid and t.group_id is null
    and not exists (select 1 from public.brewers g where g.group_id = gid and g.name = t.name);
$$;


-- ---------------------------------------------------------------------
-- 5. CREATE / JOIN now bring your private rows along. Same as in 0002,
--    plus the move_private_rows call. Leaving a group leaves the rows behind.
-- ---------------------------------------------------------------------
create or replace function public.create_group(group_name text)
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
  perform public.move_private_rows(uid, gid);
  return gid;
end;
$$;

create or replace function public.join_group(code text)
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
  perform public.move_private_rows(uid, gid);
  return gid;
end;
$$;


-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY. The old "using (true)" policies are dropped, since
--    policies for the same command are combined with OR and would let everything through.
--
--    Read: rows in your list, plus rows used by a brew you can see. That
--    subquery on brews goes through brews' own RLS, so "a brew you can see"
--    means your own and your group's brews only.
--    Insert: only into your own list. "is not distinct from" is "=" that also
--    treats null = null as true (no group = a private row).
--    Update: only rows in your list, and they must stay in it.
--    Still no delete policy: archive instead.
-- ---------------------------------------------------------------------
drop policy "beans: read"      on public.beans;
drop policy "beans: insert"    on public.beans;
drop policy "beans: update"    on public.beans;
drop policy "milks: read"      on public.milks;
drop policy "milks: insert"    on public.milks;
drop policy "milks: update"    on public.milks;
drop policy "grinders: read"   on public.grinders;
drop policy "grinders: insert" on public.grinders;
drop policy "grinders: update" on public.grinders;
drop policy "brewers: read"    on public.brewers;
drop policy "brewers: insert"  on public.brewers;
drop policy "brewers: update"  on public.brewers;

create policy "beans: read list or used" on public.beans for select to authenticated
  using (public.is_in_my_list(group_id, created_by) or exists (select 1 from public.brews b where b.bean_id = beans.id));
create policy "beans: insert into list" on public.beans for insert to authenticated
  with check (created_by = (select auth.uid()) and group_id is not distinct from (select public.my_group_id()));
create policy "beans: update list" on public.beans for update to authenticated
  using (public.is_in_my_list(group_id, created_by)) with check (public.is_in_my_list(group_id, created_by));

create policy "milks: read list or used" on public.milks for select to authenticated
  using (public.is_in_my_list(group_id, created_by) or exists (select 1 from public.brews b where b.milk_id = milks.id));
create policy "milks: insert into list" on public.milks for insert to authenticated
  with check (created_by = (select auth.uid()) and group_id is not distinct from (select public.my_group_id()));
create policy "milks: update list" on public.milks for update to authenticated
  using (public.is_in_my_list(group_id, created_by)) with check (public.is_in_my_list(group_id, created_by));

create policy "grinders: read list or used" on public.grinders for select to authenticated
  using (public.is_in_my_list(group_id, created_by) or exists (select 1 from public.brews b where b.grinder_id = grinders.id));
create policy "grinders: insert into list" on public.grinders for insert to authenticated
  with check (created_by = (select auth.uid()) and group_id is not distinct from (select public.my_group_id()));
create policy "grinders: update list" on public.grinders for update to authenticated
  using (public.is_in_my_list(group_id, created_by)) with check (public.is_in_my_list(group_id, created_by));

create policy "brewers: read list or used" on public.brewers for select to authenticated
  using (public.is_in_my_list(group_id, created_by) or exists (select 1 from public.brews b where b.brewer_id = brewers.id));
create policy "brewers: insert into list" on public.brewers for insert to authenticated
  with check (created_by = (select auth.uid()) and group_id is not distinct from (select public.my_group_id()));
create policy "brewers: update list" on public.brewers for update to authenticated
  using (public.is_in_my_list(group_id, created_by)) with check (public.is_in_my_list(group_id, created_by));


-- ---------------------------------------------------------------------
-- 7. PERMISSIONS. New functions are executable by everyone by default.
--    move_private_rows gets no grant at all: create_group and join_group run
--    as the function owner, so they can still call it.
-- ---------------------------------------------------------------------
revoke execute on function public.is_in_my_list(uuid, uuid),
  public.in_my_list(public.beans), public.in_my_list(public.milks),
  public.in_my_list(public.grinders), public.in_my_list(public.brewers),
  public.move_private_rows(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_in_my_list(uuid, uuid),
  public.in_my_list(public.beans), public.in_my_list(public.milks),
  public.in_my_list(public.grinders), public.in_my_list(public.brewers) to authenticated;
