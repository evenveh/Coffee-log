-- =====================================================================
-- Coffee Log: fix the bean photo Storage policies from 0009
-- Run once in Supabase dashboard -> SQL Editor, after 0009_bean_photos.sql.
-- =====================================================================

-- In 0009, "name" inside the beans subquery meant beans.name (the bean's name),
-- not the file path, because the innermost table with that column wins.
-- So no path ever matched and every upload and read was refused.
-- objects.name says which table we mean.

alter policy "bean-photos: read if bean readable" on storage.objects
  using (
    bucket_id = 'bean-photos'
    and exists (select 1 from public.beans b where b.id::text = (storage.foldername(objects.name))[1])
  );

alter policy "bean-photos: upload if bean in my list" on storage.objects
  with check (
    bucket_id = 'bean-photos'
    and exists (
      select 1 from public.beans b
      where b.id::text = (storage.foldername(objects.name))[1]
        and public.is_in_my_list(b.group_id, b.created_by)
    )
  );

alter policy "bean-photos: delete if bean in my list" on storage.objects
  using (
    bucket_id = 'bean-photos'
    and exists (
      select 1 from public.beans b
      where b.id::text = (storage.foldername(objects.name))[1]
        and public.is_in_my_list(b.group_id, b.created_by)
    )
  );
