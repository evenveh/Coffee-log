---
paths:
  - "src/pages/**"
  - "src/components/**"
  - "src/index.css"
  - "src/lib/styles.ts"
  - "index.html"
---

# UI rules

- Colours come from theme tokens only (`bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-crema`, `text-crema-ink`, `text-on-crema`, `text-danger`, `bg-roast-*`), never raw hex or Tailwind palette colours like `stone-*`. Every change has to work in both light and dark mode. (Exception: the photo viewer is always black.)
- Reuse the class strings in `styles.ts` (`inputClass`, `labelClass`, `primaryButton`, `secondaryButton`, `textButton`, `pageTitle`, `sectionTitle`, `listClass`) instead of writing new variants.
- Crema means score, ratio, primary action or focus. Don't give it new meanings. Crema is for fills and large text; use `crema-ink` for small accent text, because it meets the AA contrast standard.
- Important numbers (recipe, scores, days off roast) use the `num` utility.
- Lists are hairline rows (`listClass`) and forms are sections with a `border-t` divider. No card-with-shadow containers.
- No middle-dot meta strings, no all-caps labels, no `→` on buttons (`→` only inside the recipe, "18 → 36").
- Touch targets are at least 44px (`min-h-11`). Inputs use `text-base` so iOS doesn't zoom in on focus.
- Form pages hide the bottom nav: add new form routes to `FORM_ROUTES` in `Layout.tsx` and put their buttons in `StickyActions`.
- Respect the safe areas (`env(safe-area-inset-*)`) for anything fixed to the top or bottom of the screen.
- Icons come from lucide-react.
