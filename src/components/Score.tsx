// The overall score as a condensed number with a thin crema bar showing how far it is to 10.
export default function Score({ value }: { value: number }) {
  return (
    <span className="flex w-9 shrink-0 flex-col items-end justify-center gap-1" aria-label={`Score ${value} out of 10`}>
      <span className="num text-3xl leading-none">{value}</span>
      <span className="h-1 w-full rounded-full bg-line">
        <span className="block h-1 rounded-full bg-crema" style={{ width: `${value * 10}%` }} />
      </span>
    </span>
  )
}
