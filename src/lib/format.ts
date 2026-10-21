// Whole days between a 'YYYY-MM-DD' date and today (local time).
export function daysSince(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const then = new Date(y, m - 1, d) // months are 0-based in JS
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - then.getTime()) / 86_400_000) // ms per day
}

// Today as 'YYYY-MM-DD' (the format <input type="date"> uses).
export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA') // en-CA happens to format as YYYY-MM-DD
}

// Form inputs give '' for empty fields; the database wants null.
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// Turn database errors into something readable.
export function friendlyError(error: unknown): string {
  const e = error as { code?: string; message?: string }
  if (e?.code === '23505') return 'That name already exists.' // Postgres "unique violation"
  return e?.message ?? 'Something went wrong.'
}
