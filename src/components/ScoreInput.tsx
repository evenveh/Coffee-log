type Props = {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  required?: boolean
}

// A joined, segmented 1–10 bar that fills with crema up to the score. Controlled: the parent owns the value.
export default function ScoreInput({ label, value, onChange, required }: Props) {
  return (
    <fieldset>
      <legend className="mb-1.5 flex w-full items-baseline justify-between">
        <span className="text-sm text-muted">{label}{required && ' (required)'}</span>
        <span className="num text-2xl leading-none">{value ?? '–'}</span>
      </legend>
      {/* gap-px over a line-coloured background draws hairlines between the cells. */}
      <div className="grid grid-cols-10 gap-px overflow-hidden rounded-lg border border-line bg-line">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button" // not "submit": tapping a score must not submit the form
            aria-label={`${label} ${n}`}
            aria-pressed={value === n}
            // Tap the selected score again to clear it (only for optional scores).
            onClick={() => onChange(value === n && !required ? null : n)}
            className={`num h-11 text-base transition-colors ${
              value !== null && n <= value ? 'bg-crema text-on-crema' : 'bg-surface text-muted'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
