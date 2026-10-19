-- =====================================================================
-- Coffee Log: initial schema
-- Run once in Supabase dashboard -> SQL Editor.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PROFILES: one row per user, holds the display name.
--    auth.users is Supabase's built-in (hidden) user table; we can't add
--    columns to it, so we keep our own table that points to it.
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Automatically create a profile whenever someone signs up.
-- "security definer" lets the function write to profiles even though the
-- signup happens before the user is "logged in".
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));  -- default name = part before @
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 2. SHARED LIBRARIES: beans, milks, grinders.
--    Everyone can read and add. Nothing is deleted -- set archived = true
--    instead, so old brews never lose the bean/milk they point to.
-- ---------------------------------------------------------------------
create table public.beans (
  id          uuid primary key default gen_random_uuid(),
  roaster     text,
  name        text not null,
  origin      text,
  process     text,                       -- washed, natural, honey, ...
  roast_level text check (roast_level in ('light', 'medium-light', 'medium', 'medium-dark', 'dark')),
  roast_date  date,
  notes       text,
  archived    boolean not null default false,
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table public.milks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  archived   boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.grinders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  archived   boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- A few milks to start with (created_by stays empty for seeded rows).
insert into public.milks (name, created_by) values
  ('Whole', null), ('Semi-skimmed', null), ('Skim', null), ('Oat', null);


-- ---------------------------------------------------------------------
-- 3. BREWS: the private log. One row per drink.
-- ---------------------------------------------------------------------
-- An enum is a fixed list of allowed values.
create type public.drink_type as enum (
  'espresso', 'ristretto', 'lungo', 'americano',
  'cortado', 'cappuccino', 'flat_white', 'latte',
  'pour_over', 'aeropress', 'french_press', 'other'
);

create table public.brews (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade default auth.uid(),
  brewed_at        timestamptz not null default now(),
  drink_type       public.drink_type not null,

  -- What went in. "restrict" = a bean in use can't be hard-deleted.
  bean_id          uuid references public.beans (id) on delete restrict,
  grinder_id       uuid references public.grinders (id) on delete set null,
  grind_setting    numeric(6, 2),
  dose_g           numeric(5, 1) check (dose_g > 0),
  yield_g          numeric(6, 1) check (yield_g > 0),
  time_s           numeric(5, 1) check (time_s > 0),
  water_temp_c     numeric(4, 1) check (water_temp_c between 0 and 100),
  milk_id          uuid references public.milks (id) on delete set null,

  -- How it tasted. Only the overall score is required.
  rating_overall   smallint not null check (rating_overall between 1 and 10),
  sweetness        smallint check (sweetness between 1 and 10),
  acidity          smallint check (acidity between 1 and 10),
  bitterness       smallint check (bitterness between 1 and 10),
  body             smallint check (body between 1 and 10),
  latte_art_rating smallint check (latte_art_rating between 1 and 10),
  notes            text,

  created_at       timestamptz not null default now()
);

-- Makes "my brews, newest first" fast.
create index brews_user_brewed_at_idx on public.brews (user_id, brewed_at desc);


-- ---------------------------------------------------------------------
-- 4. BREW PHOTOS: points to image files in Storage (section 6).
--    Deleting a brew deletes its photo rows too (cascade).
-- ---------------------------------------------------------------------
create table public.brew_photos (
  id           uuid primary key default gen_random_uuid(),
  brew_id      uuid not null references public.brews (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  storage_path text not null,             -- e.g. "{user_id}/{brew_id}/{uuid}.webp"
  created_at   timestamptz not null default now()
);

create index brew_photos_brew_id_idx on public.brew_photos (brew_id);


-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
--    Once RLS is enabled, a table returns NOTHING unless a policy allows it.
--    "to authenticated" = only signed-in users; anonymous visitors get nothing.
--    (select auth.uid()) = the id of the user making the request.
-- ---------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.beans       enable row level security;
alter table public.milks       enable row level security;
alter table public.grinders    enable row level security;
alter table public.brews       enable row level security;
alter table public.brew_photos enable row level security;

-- Profiles: everyone can see names (handy later), only you can edit yours.
create policy "profiles: read all"   on public.profiles for select to authenticated using (true);
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Shared libraries: read, add and edit for all signed-in users. No delete policy = no deletes.
create policy "beans: read"   on public.beans for select to authenticated using (true);
create policy "beans: insert" on public.beans for insert to authenticated with check (created_by = (select auth.uid()));
create policy "beans: update" on public.beans for update to authenticated using (true) with check (true);

create policy "milks: read"   on public.milks for select to authenticated using (true);
create policy "milks: insert" on public.milks for insert to authenticated with check (created_by = (select auth.uid()));
create policy "milks: update" on public.milks for update to authenticated using (true) with check (true);

create policy "grinders: read"   on public.grinders for select to authenticated using (true);
create policy "grinders: insert" on public.grinders for insert to authenticated with check (created_by = (select auth.uid()));
create policy "grinders: update" on public.grinders for update to authenticated using (true) with check (true);

-- Brews: private. "for all" covers select, insert, update and delete.
-- "using" filters which existing rows you can touch; "with check" validates new/changed rows.
create policy "brews: own only" on public.brews for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Photos: private, and you can only attach photos to your own brews.
create policy "brew_photos: own only" on public.brew_photos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.brews b where b.id = brew_id and b.user_id = (select auth.uid()))
  );

-- Table-level permissions for the API roles (RLS above still filters the rows).
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;


-- ---------------------------------------------------------------------
-- 6. STORAGE: a private bucket for photos.
--    Files are stored as "{user_id}/{brew_id}/{file}". The policies check that
--    the first folder in the path is your own user id.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brew-photos', 'brew-photos', false, 5242880, array['image/webp', 'image/jpeg', 'image/png']);

create policy "brew-photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'brew-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "brew-photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'brew-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "brew-photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'brew-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
