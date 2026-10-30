import { useState, type PointerEvent } from 'react'

export type ChartSeries = {
  id: string
  name: string
  segments: { from: number; to: number; seconds: number }[] // seconds per step within from..to
}

type Props = {
  series: ChartSeries[]
  selectedId: string
  coarserIsHigher: boolean | null // from the grinder's slope; null = not known yet
}

// Drawing size in SVG units. The SVG scales to the page width, so these are proportions, not pixels.
const W = 340
const H = 200
const PAD = { top: 16, right: 12, bottom: 36, left: 36 }

// The grinder's fingerprint: how many seconds one step makes in each stretch of the dial.
// Each stretch is a point at its middle, joined into a line per bean; where beans agree, that's
// the grinder. The selected bean is drawn in crema, the others faint. Hand-drawn SVG: no chart library.
export default function GrinderChart({ series, selectedId, coarserIsHigher }: Props) {
  const [active, setActive] = useState<number | null>(null) // which of the selected bean's segments shows its value
  const all = series.flatMap((s) => s.segments)
  if (all.length === 0) return null

  // Scales: setting -> x, seconds -> y (from 0, so heights compare). A little air at both ends of x.
  const settings = all.flatMap((s) => [s.from, s.to])
  const xMin = Math.min(...settings) - 0.3
  const xMax = Math.max(...settings) + 0.3
  const yStep = Math.max(...all.map((s) => s.seconds)) > 30 ? 10 : 5
  const yMax = Math.max(Math.ceil(Math.max(...all.map((s) => s.seconds)) / yStep) * yStep, yStep)
  const x = (s: number) => PAD.left + ((s - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right)
  const y = (t: number) => PAD.top + ((yMax - t) / yMax) * (H - PAD.top - PAD.bottom)

  const range = xMax - xMin
  const xStep = range > 12 ? 5 : range > 6 ? 2 : 1
  const xTicks = steps(Math.ceil(xMin / xStep) * xStep, xMax, xStep)
  const yTicks = steps(0, yMax, yStep)

  const selected = series.find((s) => s.id === selectedId)
  const others = series.filter((s) => s.id !== selectedId)
  const shown = active !== null ? selected?.segments[active] : undefined
  const mid = (seg: { from: number; to: number }) => x((seg.from + seg.to) / 2)
  const line = (segs: ChartSeries['segments']) => segs.map((seg) => `${mid(seg)},${y(seg.seconds)}`).join(' ')

  // Mouse: show on hover. Touch: show on tap (a touch fires pointerleave right after, so ignore that).
  const hover = (i: number | null) => (e: PointerEvent) => e.pointerType === 'mouse' && setActive(i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Seconds per grind step across the dial">
      {/* Grid and axes: hairlines, quiet. */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-muted text-[10px]">{t} s</text>
        </g>
      ))}
      {xTicks.map((s) => (
        <text key={s} x={x(s)} y={H - PAD.bottom + 14} textAnchor="middle" className="num fill-muted text-[10px]">{s}</text>
      ))}
      {coarserIsHigher !== null && (
        <>
          <text x={PAD.left} y={H - 4} className="fill-muted text-[10px]">{coarserIsHigher ? 'Finer' : 'Coarser'}</text>
          <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-muted text-[10px]">{coarserIsHigher ? 'Coarser' : 'Finer'}</text>
        </>
      )}

      {/* Other beans: faint, for comparison. A bean with one stretch is a dot, as there's nothing to join. */}
      {others.map((s) =>
        s.segments.length === 1 ? (
          <circle key={s.id} cx={mid(s.segments[0])} cy={y(s.segments[0].seconds)} r={3} className="fill-muted opacity-35" />
        ) : (
          <polyline key={s.id} points={line(s.segments)} fill="none" className="stroke-muted opacity-35" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ),
      )}

      {selected && (
        <g>
          <polyline points={line(selected.segments)} fill="none" className="stroke-crema" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {selected.segments.map((seg, i) => (
            <g key={seg.from} onPointerEnter={hover(i)} onPointerLeave={hover(null)} onClick={() => setActive(active === i ? null : i)} className="cursor-pointer">
              <circle cx={mid(seg)} cy={y(seg.seconds)} r={14} className="fill-transparent" />
              <circle cx={mid(seg)} cy={y(seg.seconds)} r={4} className="fill-crema stroke-bg" strokeWidth={2} />
            </g>
          ))}
        </g>
      )}

      {/* The value of the hovered or tapped stretch. paint-order draws a background-coloured outline under the text. */}
      {shown && (
        <text
          x={mid(shown)}
          y={y(shown.seconds) - 12}
          textAnchor={mid(shown) < W * 0.2 ? 'start' : mid(shown) > W * 0.8 ? 'end' : 'middle'}
          className="num fill-ink stroke-bg text-xs"
          strokeWidth={4}
          paintOrder="stroke"
        >
          {shown.from} to {shown.to}: {Math.round(shown.seconds)} s per step
        </text>
      )}
    </svg>
  )
}

// from, from + step, ... up to and including to (rounded, so 0.1 steps don't drift).
function steps(from: number, to: number, step: number): number[] {
  const out: number[] = []
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}
