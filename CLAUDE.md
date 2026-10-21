# Coffee Log

Installable PWA for logging and rating home espresso and filter brews. See README.md for features and setup.

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
- `supabase/migrations/`: schema, RLS policies, storage bucket

## Conventions
- Data access goes through a hook in `src/hooks/`; pages and components don't query tables directly. Exception: `supabase.auth` calls (sign in/out in `Login`, `Settings`, `AuthProvider`).
- Comments are short, plain-English explanations of *why*. Keep that style.
- Mobile first: the app is used on a phone while brewing.
- UI copy: sentence case, plain verbs, one name per action ("Log brew" leads to "Save brew"). Errors say what to fix.
- Never read or edit `.env*` files (a hook blocks it). Ask for values instead.

## Environments
Local dev (`.env.local`) and production use the **same** Supabase project. Anything created, deleted or migrated while testing affects the live app and both users. Say so before running SQL or deleting data.

## Design ("Dial-in notebook")
Theme tokens in `src/index.css` (light + dark via `prefers-color-scheme`). Crema is reserved for scores, the ratio, the primary button and focus. The `num` utility (condensed, tabular Archivo) is the signature for recipes, scores and days off roast. Roast-level colours (`RoastSwatch`) carry information. Lists use hairline rows, not cards. Details in `.claude/rules/ui.md`.
