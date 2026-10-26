-- =====================================================================
-- Coffee Log: table permissions for brewers (missing from 0004)
-- Run once in Supabase dashboard -> SQL Editor, after 0004_brewers.sql.
-- =====================================================================

-- Supabase grants everything on new tables to anon and authenticated by default,
-- and the revoke in 0001 only covered tables that existed then.
-- Same as the other shared libraries: signed-in users only, and no deletes
-- (archive instead), so delete is blocked here as well as by RLS.
revoke all on public.brewers from anon, authenticated;
grant select, insert, update on public.brewers to authenticated;
