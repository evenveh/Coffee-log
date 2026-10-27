-- =====================================================================
-- Coffee Log: mocca drink type (espresso, milk and chocolate)
-- Run once in Supabase dashboard -> SQL Editor, after 0006_group_libraries.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. New drink type. Must match the value in src/lib/drinkTypes.ts.
--    "after" only sets the enum's sort order; chip order comes from DRINK_TYPES.
-- ---------------------------------------------------------------------
alter type public.drink_type add value 'mocca' after 'latte';
