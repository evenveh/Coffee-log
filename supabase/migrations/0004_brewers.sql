-- =====================================================================
-- Coffee Log: brewers (V60, Moccamaster...) and a drink type for machine brews
-- Run once in Supabase dashboard -> SQL Editor, after 0003_group_photos.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. New drink type for Moccamaster-style machines.
--    "after" only sets the enum's sort order; chip order comes from DRINK_TYPES.
--    Nothing below uses the new value, so this can run in the same transaction.
-- ---------------------------------------------------------------------
alter type public.drink_type add value 'filter_machine' after 'pour_over';


-- ---------------------------------------------------------------------
-- 2. BREWERS: shared library, same shape as grinders.
--    Shared with every signed-in user. Archive, never delete.
-- ---------------------------------------------------------------------
create table public.brewers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  archived   boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.brewers enable row level security;

-- Shared library: read, add and edit for all signed-in users. No delete policy = no deletes.
create policy "brewers: read"   on public.brewers for select to authenticated using (true);
create policy "brewers: insert" on public.brewers for insert to authenticated with check (created_by = (select auth.uid()));
create policy "brewers: update" on public.brewers for update to authenticated using (true) with check (true);

-- A few brewers to start with (created_by stays empty for seeded rows).
-- The SQL Editor runs as postgres, which skips RLS, so the insert policy doesn't apply here.
insert into public.brewers (name, created_by) values
  ('Hario V60', null), ('Moccamaster', null), ('Wilfa Performance', null);


-- ---------------------------------------------------------------------
-- 3. Which brewer a brew was made with. Optional: espresso and old brews have none.
--    Brews already have RLS policies, so a new column needs no policy change.
-- ---------------------------------------------------------------------
alter table public.brews
  add column brewer_id uuid references public.brewers (id) on delete set null;
