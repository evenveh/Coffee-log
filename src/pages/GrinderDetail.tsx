import { useState } from 'react'
import { useParams } from 'react-router-dom'
import GrinderChart from '../components/GrinderChart'
import { useBrews } from '../hooks/useBrews'
import { useNamedList } from '../hooks/useNamedList'
import { DEFAULT_TARGET, grinderProfile, settingStats, shotFlow, suggest, targetFlow, type Suggestion } from '../lib/dialIn'
import { parseNumber } from '../lib/format'
import { inputClass, labelClass, listClass, pageTitle, sectionTitle } from '../lib/styles'

// The most the target fields accept. Beyond these the chart is all model and no measurement.
const LIMITS = { dose: 40, ratio: 10, time: 120 }

// One grinder: how sensitive it is and where each bean lands, from my own espresso shots (lib/dialIn.ts).
export default function GrinderDetail() {
  const { id } = useParams()
  const brews = useBrews()
  const grinders = useNamedList('grinders')
  const [picked, setPicked] = useState<string | null>(null) // bean shown in the chart
  // A different target to look at the chart with. Only for this page and never saved:
  // Log brew keeps using DEFAULT_TARGET. Empty fields mean the default.
  const [custom, setCustom] = useState({ dose: '', ratio: '', time: '' })

  if (brews.isLoading || grinders.isLoading) return <p className="text-muted">Loading…</p>
  const grinder = grinders.data?.find((g) => g.id === id)
  if (!grinder || !brews.data) return <p className="text-muted">This grinder doesn't exist, or it's not in your list.</p>
  const all = brews.data

  // My espresso shots on this grinder, newest first. By default everything is scaled to my usual
  // dose (the median, to the nearest half gram), so shots of different sizes compare and one odd
  // shot doesn't move the chart.
  const shots = all.filter((b) => b.grinder_id === grinder.id && b.grind_setting != null && shotFlow(b) != null)
  const doses = shots.flatMap((b) => (b.dose_g ? [b.dose_g] : []))
  const usualDose = doses.length > 0 ? Math.round(median(doses) * 2) / 2 : null
  if (!usualDose) {
    return (
      <article className="flex flex-col gap-2">
        <h1 className={pageTitle}>{grinder.name}</h1>
        <p className="text-muted">No espresso shots with this grinder yet. Log a few with grind setting, yield and time, and this page shows how it behaves.</p>
      </article>
    )
  }

  // A typed value if it's a positive number, else the default (the fields are already capped, see field()).
  const pick = (text: string, fallback: number) => {
    const n = readTarget(text)
    return n && n > 0 ? n : fallback
  }
  const dose = pick(custom.dose, usualDose)
  const target = { ratio: pick(custom.ratio, DEFAULT_TARGET.ratio), time_s: pick(custom.time, DEFAULT_TARGET.time_s) }

  const profile = grinderProfile(all, grinder.id, dose)
  const goal = targetFlow(target, dose)
  const toTime = (flow: number) => (dose * target.ratio) / flow

  // One entry per bean, most recently brewed first.
  const beanIds = [...new Set(shots.map((b) => b.bean_id).filter((b): b is string => b != null))]
  const beans = beanIds.map((beanId) => {
    const stats = settingStats(all, beanId, grinder.id, dose)
    return {
      id: beanId,
      name: shots.find((b) => b.bean_id === beanId)?.bean?.name ?? 'Unknown bean',
      suggestion: suggest(stats, profile, goal),
      averages: stats.map((s) => ({ setting: s.setting, time: toTime(s.flow), shots: s.shots })),
    }
  })
  const selectedId = picked ?? beans[0]?.id
  // Typing past a limit sets the field to the limit, so the field always shows what the chart uses.
  const field = (key: keyof typeof custom) => (e: { target: { value: string } }) => {
    const n = readTarget(e.target.value)
    const value = n && n > LIMITS[key] ? String(LIMITS[key]) : e.target.value
    setCustom((c) => ({ ...c, [key]: value }))
  }

  return (
    <article className="flex flex-col gap-6">
      <h1 className={pageTitle}>{grinder.name}</h1>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className={sectionTitle}>Time for 1:{target.ratio} at {dose} g</h2>
        <GrinderChart series={beans} selectedId={selectedId} targetTime={target.time_s} coarserIsHigher={profile.slope ? profile.slope > 0 : null} />

        {/* Folded away: it's for exploring, not something you need every visit. */}
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted">Change dose, ratio or time</summary>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <TargetField id="dose" label="Dose (g)" value={custom.dose} onChange={field('dose')} placeholder={String(usualDose)} />
            <TargetField id="ratio" label="Ratio (1:x)" value={custom.ratio} onChange={field('ratio')} placeholder={String(DEFAULT_TARGET.ratio)} />
            <TargetField id="time" label="Time (s)" value={custom.time} onChange={field('time')} placeholder={String(DEFAULT_TARGET.time_s)} />
          </div>
        </details>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className={sectionTitle}>Where your beans land for 1:{target.ratio} in {target.time_s} s</h2>
        <ul className={listClass}>
          {beans.map((b) => (
            <li key={b.id}>
              {/* The rows double as the chart's legend: the line key matches how the bean is drawn. */}
              <button onClick={() => setPicked(b.id)} aria-pressed={b.id === selectedId} className="flex min-h-11 w-full items-center gap-3 py-1 text-left">
                <span className={`h-0.5 w-4 shrink-0 rounded-full ${b.id === selectedId ? 'bg-crema' : 'bg-muted opacity-35'}`} />
                <span className={`flex-1 ${b.id === selectedId ? 'font-semibold' : ''}`}>{b.name}</span>
                <span className="num text-xl">{landing(b.suggestion)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}

// One small number input. The placeholder shows the default that an empty field falls back to.
function TargetField(props: { id: string; label: string; value: string; onChange: (e: { target: { value: string } }) => void; placeholder: string }) {
  return (
    <div>
      <label className={labelClass} htmlFor={props.id}>{props.label}</label>
      <input id={props.id} inputMode="decimal" value={props.value} onChange={props.onChange} placeholder={props.placeholder} className={`${inputClass} num text-xl`} />
    </div>
  )
}

// A target field as a number. "1:2.5" and "2.5" both work for the ratio.
function readTarget(text: string): number | null {
  return parseNumber(text.replace(/^\s*1\s*:/, ''))
}

// The middle value once sorted (the average of the middle two for an even count).
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// The setting to aim for, or which way to go when we can't say how far yet.
function landing(s: Suggestion | null): string {
  if (!s) return '–'
  return s.kind === 'direction' ? s.direction : String(s.setting)
}
