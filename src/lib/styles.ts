// Reusable Tailwind class strings, so controls look the same everywhere.
// Colours are theme tokens (see index.css), so these work in light and dark mode.

// min-h-11 = 44px: a comfortable touch target. text-base (16px) stops iOS zooming on focus.
export const inputClass = 'min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-muted/70'
export const labelClass = 'mb-1 block text-sm font-medium text-muted'
export const primaryButton = 'inline-flex min-h-11 items-center justify-center rounded-lg bg-crema px-4 font-semibold text-on-crema disabled:opacity-50'
export const secondaryButton = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 font-medium text-ink disabled:opacity-50'
export const textButton = 'min-h-11 text-sm text-muted underline underline-offset-2'

// Page title and section headings.
export const pageTitle = 'text-2xl'
export const sectionTitle = 'text-base font-semibold'

// A list whose rows are separated by hairlines instead of floating cards.
export const listClass = 'divide-y divide-line border-y border-line'
