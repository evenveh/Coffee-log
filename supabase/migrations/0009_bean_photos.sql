-- =====================================================================
-- Coffee Log: one photo per bean (the bag)
-- Run once in Supabase dashboard -> SQL Editor, after 0008_optional_rating.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. COLUMN: where the photo is stored. null = no photo.
--    The thumbnail path is derived from it, as for brew photos.
--    Covered by the table-wide grant in 0001, so no new grant is needed.
-- ---------------------------------------------------------------------
alter table public.beans add column photo_path text;


-- ---------------------------------------------------------------------
-- 2. BUCKET: private, JPEG only (the app compresses to JPEG before upload).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bean-photos', 'bean-photos', false, 5242880, array['image/jpeg']);


-- ---------------------------------------------------------------------
-- 3. FILES: paths start with the bean id, not a user id ("<bean id>/<name>.jpg"),
--    because a bean belongs to a group, and anyone in it can change the bean.
--    The file follows the bean when its creator leaves the group.
--    Compared as text, so a path that isn't a bean id simply doesn't match.
-- ---------------------------------------------------------------------

-- Readable when the bean is. The subquery runs under the beans table's own RLS,
-- so this picks up "in my list or used by a brew I can see" without repeating it.
create policy "bean-photos: read if bean readable" on storage.objects for select to authenticated
  using (
    bucket_id = 'bean-photos'
    and exists (select 1 from public.beans b where b.id::text = (storage.foldername(name))[1])
  );

-- Upload and delete only for beans in my list, the same rule as editing the bean.
-- "Readable" isn't enough: a friend's bean is readable when their brew uses it.
create policy "bean-photos: upload if bean in my list" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bean-photos'
    and exists (
      select 1 from public.beans b
      where b.id::text = (storage.foldername(name))[1]
        and public.is_in_my_list(b.group_id, b.created_by)
    )
  );

create policy "bean-photos: delete if bean in my list" on storage.objects for delete to authenticated
  using (
    bucket_id = 'bean-photos'
    and exists (
      select 1 from public.beans b
      where b.id::text = (storage.foldername(name))[1]
        and public.is_in_my_list(b.group_id, b.created_by)
    )
  );

-- No update policy: a new photo gets a new file name, and the old file is deleted.
