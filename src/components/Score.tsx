// The overall score as a condensed number with a thin crema bar showing how far it is to 10.
// Unrated brews (saved before tasting) show a muted placeholder in the same slot, so rows stay aligned.
export default function Score({ value, unratedLabel = '–' }: { value: number | null; unratedLabel?: string }) {
  if (value === null) {
    return <span className="flex w-9 shrink-0 items-center justify-end text-sm text-muted">{unratedLabel}</span>
  }
  return (
    <span className="flex w-9 shrink-0 flex-col items-end justify-center gap-1" aria-label={`Score ${value} out of 10`}>
      <span className="num text-3xl leading-none">{value}</span>
      <span className="h-1 w-full rounded-full bg-line">
        <span className="block h-1 rounded-full bg-crema" style={{ width: `${value * 10}%` }} />
      </span>
    </span>
  )
}
