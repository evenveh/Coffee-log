-- =====================================================================
-- Coffee Log: save a brew before rating it (rate it after tasting)
-- Run once in Supabase dashboard -> SQL Editor, after 0007_mocca.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The overall score becomes optional. null means "not rated yet".
--    The 1-10 check stays: a check on null passes.
-- ---------------------------------------------------------------------

alter table public.brews
  alter column rating_overall drop not null;