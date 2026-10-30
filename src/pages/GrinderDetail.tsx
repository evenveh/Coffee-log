import { useState } from 'react'
import { useParams } from 'react-router-dom'
import GrinderChart from '../components/GrinderChart'
import { useBrews } from '../hooks/useBrews'
import { useNamedList } from '../hooks/useNamedList'
import { DEFAULT_TARGET, grinderProfile, settingStats, shotFlow, suggest, targetFlow, type Suggestion } from '../lib/dialIn'
import { listClass, pageTitle, sectionTitle } from '../lib/styles'

// One grinder: how sensitive it is and where each bean lands, from my own espresso shots (lib/dialIn.ts).
export default function GrinderDetail() {
  const { id } = useParams()
  const brews = useBrews()
  const grinders = useNamedList('grinders')
  const [picked, setPicked] = useState<string | null>(null) // bean shown in the chart

  if (brews.isLoading || grinders.isLoading) return <p className="text-muted">Loading…</p>
  const grinder = grinders.data?.find((g) => g.id === id)
  if (!grinder || !brews.data) return <p className="text-muted">This grinder doesn't exist, or it's not in your list.</p>
  const all = brews.data

  // My espresso shots on this grinder, newest first. Everything is scaled to my usual dose
  // (the median, to the nearest half gram), so shots of different sizes compare and one odd
  // shot doesn't move the chart.
  const shots = all.filter((b) => b.grinder_id === grinder.id && b.grind_setting != null && shotFlow(b) != null)
  const doses = shots.flatMap((b) => (b.dose_g ? [b.dose_g] : []))
  const dose = doses.length > 0 ? Math.round(median(doses) * 2) / 2 : null
  if (!dose) {
    return (
      <article className="flex flex-col gap-2">
        <h1 className={pageTitle}>{grinder.name}</h1>
        <p className="text-muted">No espresso shots with this grinder yet. Log a few with grind setting, yield and time, and this page shows how it behaves.</p>
      </article>
    )
  }

  const profile = grinderProfile(all, grinder.id, dose)
  const goal = targetFlow(DEFAULT_TARGET, dose)
  const toTime = (flow: number) => (dose * DEFAULT_TARGET.ratio) / flow

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
  const goalText = `1:${DEFAULT_TARGET.ratio} in ${DEFAULT_TARGET.time_s} s`

  return (
    <article className="flex flex-col gap-6">
      <h1 className={pageTitle}>{grinder.name}</h1>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className={sectionTitle}>Time for 1:{DEFAULT_TARGET.ratio} at {dose} g</h2>
        <GrinderChart series={beans} selectedId={selectedId} targetTime={DEFAULT_TARGET.time_s} coarserIsHigher={profile.slope ? profile.slope > 0 : null} />
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className={sectionTitle}>Where your beans land for {goalText}</h2>
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
