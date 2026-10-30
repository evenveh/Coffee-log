import { useState, type PointerEvent } from 'react'

type Point = { setting: number; time: number }

export type ChartSeries = {
  id: string
  name: string
  averages: (Point & { shots: number })[] // one per setting, sorted by setting
}

type Props = {
  series: ChartSeries[]
  selectedId: string
  targetTime: number
  ratio: number // the target ratio the times are converted to, for the labels
  ideal: number | null // the selected grinder's suggested setting, drawn where it meets the target
  coarserIsHigher: boolean | null // from the selected grinder's slope; null = not known yet
  precision: number // decimals the selected grinder's settings are logged in
}

// Drawing size in SVG units. The SVG scales to the page width, so these are proportions, not pixels.
const W = 340
const H = 220
const PAD = { top: 16, right: 12, bottom: 36, left: 36 }

// One bean: estimated time to reach the target ratio at each grind setting, worked out from the flow
// rate (g/s) of my earlier shots, one line per grinder I used it with.
// The selected grinder is drawn in crema, others faint. Hand-drawn SVG: no chart library.
export default function BeanChart({ series, selectedId, targetTime, ratio, ideal, coarserIsHigher, precision }: Props) {
  const [active, setActive] = useState<number | 'ideal' | null>(null) // which point shows its label
  const all = series.flatMap((s) => s.averages)
  if (all.length === 0) return null

  // Scales: setting -> x, seconds -> y (slower shots higher up). A little air at both ends of x.
  // The ideal counts too: when it's extrapolated, it lies outside the settings tried.
  const settings = [...all.map((p) => p.setting), ...(ideal !== null ? [ideal] : [])]
  const xMin = Math.min(...settings) - 0.3
  const xMax = Math.max(...settings) + 0.3
  const times = [...all.map((p) => p.time), targetTime]
  const yMin = Math.floor(Math.min(...times) / 10) * 10
  const yMax = Math.max(Math.ceil(Math.max(...times) / 10) * 10, yMin + 10)
  const x = (s: number) => PAD.left + ((s - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right)
  const y = (t: number) => PAD.top + ((yMax - t) / (yMax - yMin)) * (H - PAD.top - PAD.bottom)

  const range = xMax - xMin
  // Half steps while the labels still fit, but never finer than the settings are logged in:
  // a grinder logged in whole steps has no halves to dial.
  const xStep = range > 12 ? 5 : range > 6 ? 2 : range > 5 || precision === 0 ? 1 : 0.5
  const xTicks = steps(Math.ceil(xMin / xStep) * xStep, xMax, xStep)
  const yTicks = steps(yMin, yMax, 10)

  const selected = series.find((s) => s.id === selectedId)
  const others = series.filter((s) => s.id !== selectedId)
  const line = (points: Point[]) => points.map((p) => `${x(p.setting)},${y(p.time)}`).join(' ')
  // The label for the hovered or tapped point. The times are converted (how long that setting
  // takes to reach the target ratio), not measured, so the label says "about … to 1:2".
  const point = typeof active === 'number' ? selected?.averages[active] : undefined
  const tip =
    active === 'ideal' && ideal !== null
      ? { x: x(ideal), y: y(targetTime), text: `Estimated grind setting for a 1:${ratio} in ${targetTime}: s${ideal}` }
      : point && { x: x(point.setting), y: y(point.time), text: `${point.setting}: about ${Math.round(point.time)} s to 1:${ratio} (${point.shots} ${point.shots === 1 ? 'shot' : 'shots'})` }

  // Mouse: show on hover. Touch: show on tap (a touch fires pointerleave right after, so ignore that).
  const hover = (i: number | 'ideal' | null) => (e: PointerEvent) => e.pointerType === 'mouse' && setActive(i)
  const tap = (i: number | 'ideal') => () => setActive(active === i ? null : i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Estimated shot time by grind setting${selected ? ` for ${selected.name}` : ''}`}>
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

      {/* The target time, slightly stronger than the grid. */}
      <line x1={PAD.left} x2={W - PAD.right} y1={y(targetTime)} y2={y(targetTime)} className="stroke-muted" strokeWidth={1} />
      <text x={W - PAD.right} y={y(targetTime) - 4} textAnchor="end" className="fill-muted text-[10px]">Target</text>

      {/* Other grinders: faint lines, for comparison. */}
      {others.map((s) => (
        <polyline key={s.id} points={line(s.averages)} fill="none" className="stroke-muted opacity-35" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ))}

      {selected && (
        <g>
          <polyline points={line(selected.averages)} fill="none" className="stroke-crema" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {selected.averages.map((p, i) => (
            <g key={p.setting} onPointerEnter={hover(i)} onPointerLeave={hover(null)} onClick={tap(i)} className="cursor-pointer">
              <circle cx={x(p.setting)} cy={y(p.time)} r={14} className="fill-transparent" />
              <circle cx={x(p.setting)} cy={y(p.time)} r={4} className="fill-crema stroke-bg" strokeWidth={2} />
            </g>
          ))}
        </g>
      )}

      {/* The ideal: where the line meets the target. Hollow, so it reads as "aim here", not a measured shot. */}
      {ideal !== null && (
        <g onPointerEnter={hover('ideal')} onPointerLeave={hover(null)} onClick={tap('ideal')} className="cursor-pointer">
          <circle cx={x(ideal)} cy={y(targetTime)} r={14} className="fill-transparent" />
          <circle cx={x(ideal)} cy={y(targetTime)} r={5} className="fill-bg stroke-crema" strokeWidth={2} />
        </g>
      )}

      {/* The label of the hovered or tapped point. paint-order draws a background-coloured outline under the text. */}
      {tip && (
        <text
          x={tip.x}
          y={tip.y - 12}
          textAnchor={tip.x < W * 0.3 ? 'start' : tip.x > W * 0.7 ? 'end' : 'middle'}
          className="num fill-ink stroke-bg text-xs"
          strokeWidth={4}
          paintOrder="stroke"
        >
          {tip.text}
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
