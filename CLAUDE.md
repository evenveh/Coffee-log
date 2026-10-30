# Coffee Log

Installable PWA for logging and rating home espresso and filter brews. See README.md for features and setup.

## This is a learning project
The goal is for the user to learn app development and the technologies in this stack, not just to get features built. Keep them engaged and hands on:
- Before building a feature, agree on the approach together, and explain the trade-offs and the concepts involved (e.g. RLS, query keys, effects).
- Break work into small steps. Where a step teaches something new, offer to let the user write it, with hints, and review their code afterwards instead of writing it all yourself.
- When you do write code, explain the non-obvious parts and point to the relevant files and docs. Name the general concept, not just the fix.
- Don't silently fix the user's mistakes: point them out and explain why they're wrong.
- Suggest follow-up exercises when they fit.

## Stack
Vite · React 19 · TypeScript · Tailwind v4 · React Router 7 · TanStack Query · Supabase (Postgres, auth, storage) · vite-plugin-pwa. Hosted on Vercel; pushes to `main` deploy automatically.

## Commands
- `npm run build`: type-check and build. Run it to verify changes (there is no test suite).
- `npm run lint`: oxlint
- `npm run dev`: dev server (no service worker); `npm run preview` to test PWA behaviour
- `npm run generate-icons`: regenerate all app icons from `public/logo.svg`

## Layout
- `src/pages/`: one component per route (routes are in `src/App.tsx`)
- `src/hooks/`: all Supabase data access, as TanStack Query hooks (`useBeans`, `useBrews`, ...)
- `src/components/`: shared UI (`Layout`, `StickyActions`, `ScoreInput`, `RoastSwatch`, ...)
- `src/lib/`: Supabase client, shared types, `drinkTypes.ts`, `format.ts`, `styles.ts` (shared Tailwind class strings)
- `supabase/migrations/`: schema, RLS policies, storage bucket. Applied by hand in the Supabase SQL Editor, in order.
- `scripts/check-anon-access.mjs`: verifies anonymous visitors can't read or write anything. Run it after policy changes (it needs `.env.local`, so ask the user to run it).

## Data model and privacy
- Beans, milks, grinders and brewers belong to a group (`group_id`), or to their creator alone when they have no group (archive, never delete). Joining or creating a group moves your private rows into it; leaving leaves them behind. RLS also lets you read rows used by any brew you can see, so lists must filter on the `in_my_list` computed field (`select('*, in_my_list')`).
- Brews belong to one user. Members of that user's group (`groups`, `group_members`, one group per user) can read them (Friends tab, `/friends/:id`) but can't change them. The same goes for photos: group members can view them, only the owner can add or delete them.
- RLS returns group members' brews too, so anything showing *my* brews must filter `.eq('user_id', user.id)`, as `useBrews` and `useBrew` do. Friends' brews come from `useFriendBrews` under a separate query key.
- RLS is the security boundary; `RequireAuth` and UI checks are only UX. Details in `.claude/rules/database.md`.

## Conventions
- Data access goes through a hook in `src/hooks/`; pages and components don't query tables directly. Exception: `supabase.auth` calls (sign in/out in `Login`, `Settings`, `AuthProvider`).
- Comments are short, plain-English explanations of *why*. Keep that style.
- Mobile first: the app is used on a phone while brewing.
- UI copy: sentence case, plain verbs, one name per action ("Log brew" leads to "Save brew"). Errors say what to fix.
- Never read or edit `.env*` files (a hook blocks it). Ask for values instead.

## Environments
Local dev (`.env.local`) and production use the **same** Supabase project. Anything created, deleted or migrated while testing affects the live app and everyone using it. Say so before running SQL or deleting data.

## Design ("Dial-in notebook")
Theme tokens in `src/index.css` (light + dark via `prefers-color-scheme`). Crema is reserved for scores, the ratio, the primary button, focus and the highlighted series in a chart. The `num` utility (condensed, tabular Archivo) is the signature for recipes, scores and days off roast. Roast-level colours (`RoastSwatch`) carry information. Lists use hairline rows, not cards. Details in `.claude/rules/ui.md`.
