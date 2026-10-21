// Whole days between a 'YYYY-MM-DD' date and another moment (default: today), in local time.
export function daysSince(isoDate: string, until: Date = new Date()): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const then = new Date(y, m - 1, d) // months are 0-based in JS
  const end = new Date(until)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - then.getTime()) / 86_400_000) // ms per day
}

// Today as 'YYYY-MM-DD' (the format <input type="date"> uses).
export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA') // en-CA happens to format as YYYY-MM-DD
}

// ISO timestamp -> 'YYYY-MM-DDTHH:mm' in local time (the format <input type="datetime-local"> uses).
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()) // shift so toISOString shows local time
  return d.toISOString().slice(0, 16)
}

// e.g. "Mon 20 Oct, 08:14"
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// e.g. "08:14"
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// "Today", "Yesterday", "Mon 20 Oct" (plus the year if it isn't this year).
export function formatDayHeading(day: string): string {
  const today = todayIso()
  if (day === today) return 'Today'
  if (daysSince(day) === 1) return 'Yesterday'
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const sameYear = today.slice(0, 4) === day.slice(0, 4)
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' })
}

// Split an already-sorted list into consecutive groups per local calendar day.
export function groupByDay<T extends { brewed_at: string }>(items: T[]): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = []
  for (const item of items) {
    const day = new Date(item.brewed_at).toLocaleDateString('en-CA') // 'YYYY-MM-DD', local time
    const last = groups[groups.length - 1]
    if (last?.day === day) last.items.push(item)
    else groups.push({ day, items: [item] })
  }
  return groups
}

// "1:2.0" from 18 g in and 36 g out. null if either is missing.
export function formatRatio(dose: number | null, out: number | null): string | null {
  if (!dose || !out) return null
  return `1:${(out / dose).toFixed(1)}`
}

// 28 -> "28 s", 210 -> "3:30"
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Form text -> number. Accepts comma decimals ("18,5") and, for times, "m:ss" ("3:30").
// '' -> null. Anything unreadable -> NaN, so the form can complain.
export function parseNumber(value: string): number | null {
  const v = value.trim().replace(',', '.')
  if (v === '') return null
  if (v.includes(':')) {
    const [m, s] = v.split(':').map(Number)
    return m * 60 + s
  }
  return Number(v)
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
  if (e?.code === '23514') return 'A value is out of range.' // Postgres "check violation"
  return e?.message ?? 'Something went wrong.'
}
