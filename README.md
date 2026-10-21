# ☕ Coffee Log

A small, installable web app for logging and rating home espresso and filter brews.

- **Shared library:** beans (with roast date), milks and grinders, visible to all users
- **Private brew log:** drink type, grind, dose / yield / time, water temperature, milk
- **Ratings:** overall 1–10, optional sweetness / acidity / bitterness / body, latte art for milk drinks
- **Photos:** compressed on the phone before upload, with thumbnails
- **Dialing in:** live brew ratio, days off roast, "Copy last brew" and "Brew again"
- **Installable** on Android and iOS (PWA)

Runs entirely on free tiers: **Vercel** (hosting) + **Supabase** (Postgres, auth, storage).

## Tech stack

Vite · React · TypeScript · Tailwind CSS · React Router · TanStack Query · Supabase · vite-plugin-pwa

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and publishable/anon key
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (no service worker) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally (service worker active) |
| `npm run lint` | Lint with oxlint |
| `npm run generate-icons` | Regenerate all app icons from `public/logo.svg` |

## Database

The schema, Row Level Security policies and storage bucket are in
[`supabase/migrations/`](supabase/migrations/). For a new Supabase project, run the files in order
in the dashboard's SQL Editor.

Security model: everything requires sign-in. Beans, milks and grinders are shared; brews and photos
are only visible to their owner (enforced by RLS in the database, not just the UI).
`node --env-file=.env.local scripts/check-anon-access.mjs` verifies that anonymous visitors can't
read or write anything.

## Deployment

Pushes to `main` deploy automatically on Vercel. The Vercel project needs the same two
`VITE_SUPABASE_*` environment variables as `.env.local`. `vercel.json` rewrites all paths to
`index.html` so client-side routes survive a page refresh.
