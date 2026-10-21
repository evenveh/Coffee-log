type Props = {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  required?: boolean
}

// A row of 1–10 buttons. Controlled: the parent owns the value.
export default function ScoreInput({ label, value, onChange, required }: Props) {
  return (
    <fieldset>
      <legend className="mb-1 flex w-full justify-between text-sm font-medium">
        <span>{label}{required && ' *'}</span>
        <span className="text-coffee-600">{value ?? '–'}</span>
      </legend>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button" // not "submit": tapping a score must not submit the form
            aria-pressed={value === n}
            // Tap the selected score again to clear it (only for optional scores).
            onClick={() => onChange(value === n && !required ? null : n)}
            className={`rounded-md py-2 text-sm font-medium ${
              value !== null && n <= value ? 'bg-coffee-600 text-white' : 'bg-coffee-100 text-coffee-800'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
