---
paths:
  - "supabase/**"
  - "scripts/**"
  - "src/hooks/**"
  - "src/lib/types.ts"
  - "src/lib/drinkTypes.ts"
  - "src/lib/photos.ts"
---

# Database rules

- Schema changes go in a new numbered migration (`0002_...sql`). Never edit a migration that has already been applied. Migrations are run by hand in the Supabase SQL Editor, so say so when one is added. Remember dev and production share one database.
- Every new table gets RLS enabled plus explicit policies. Model: beans, milks and grinders are shared (any signed-in user; archive instead of delete); brews and photos are owner-only. Storage paths start with `<user id>/`.
- Keep `src/lib/types.ts` and `drinkTypes.ts` in sync with the schema. `DRINK_TYPES` must match the `drink_type` enum. New brew columns that pages need may also have to be added to `BREW_SELECT` in `useBrews.ts`.
- Hook pattern: `if (error) throw error`, and invalidate the relevant query keys in `onSuccess`.
- Storage files are not removed by database cascades. Anything that deletes photos or brews must remove the files (full and `_thumb`) first, as `useDeleteBrew` does.
- After policy changes, suggest running `node --env-file=.env.local scripts/check-anon-access.mjs`.
