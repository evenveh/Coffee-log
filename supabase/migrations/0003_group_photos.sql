-- =====================================================================
-- Coffee Log: group members can see each other's brew photos
-- Run once in Supabase dashboard -> SQL Editor, after 0002_groups.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PHOTO ROWS: read own and group, write own only.
--    Same split as brews in 0002: the old "for all" policy becomes one
--    policy per command. It must be dropped, because policies for the same
--    command are combined with OR, so the old one couldn't narrow anything.
-- ---------------------------------------------------------------------
drop policy "brew_photos: own only" on public.brew_photos;

create policy "brew_photos: read own and group" on public.brew_photos for select to authenticated
  using (user_id = (select auth.uid()) or public.in_my_group(user_id));

-- Still only on your own brews: the exists check compares b.user_id to you
-- directly, so being able to read a friend's brew doesn't let you add to it.
create policy "brew_photos: insert own" on public.brew_photos for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.brews b where b.id = brew_id and b.user_id = (select auth.uid()))
  );

create policy "brew_photos: delete own" on public.brew_photos for delete to authenticated
  using (user_id = (select auth.uid()));

-- No update policy: the app never changes a photo row, so updates are blocked.


-- ---------------------------------------------------------------------
-- 2. PHOTO FILES: also readable when the first folder (the owner's user id)
--    belongs to someone in your group. Added next to "brew-photos: read own";
--    either one is enough to read a file. Upload and delete stay own only.
--    Compared as text, so a path that isn't a user id simply doesn't match
--    (casting it to uuid would raise an error instead).
-- ---------------------------------------------------------------------
create policy "brew-photos: read group" on storage.objects for select to authenticated
  using (
    bucket_id = 'brew-photos'
    and (storage.foldername(name))[1] in (
      select m.user_id::text from public.group_members m where m.group_id = (select public.my_group_id())
    )
  );
