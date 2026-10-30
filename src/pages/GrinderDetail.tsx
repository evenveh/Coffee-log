import { useState } from 'react'
import { useParams } from 'react-router-dom'
import GrinderChart from '../components/GrinderChart'
import { useBrews } from '../hooks/useBrews'
import { useNamedList } from '../hooks/useNamedList'
import { DEFAULT_TARGET, grinderProfile, secondsPerStep, segments, settingStats, shotFlow, suggest, targetFlow, usualDose, type Suggestion } from '../lib/dialIn'
import { listClass, pageTitle, sectionTitle } from '../lib/styles'

// One grinder: how big a step is across the dial (its fingerprint) and where each bean lands,
// from my own espresso shots (lib/dialIn.ts).
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
  // (see usualDose), so shots of different sizes compare and one odd shot doesn't move the chart.
  const shots = all.filter((b) => b.grinder_id === grinder.id && b.grind_setting != null && shotFlow(b) != null)
  const dose = usualDose(shots)
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

  // One entry per bean, most recently brewed first.
  const beanIds = [...new Set(shots.map((b) => b.bean_id).filter((b): b is string => b != null))]
  const beans = beanIds.map((beanId) => {
    const stats = settingStats(all, beanId, grinder.id, dose)
    return {
      id: beanId,
      name: shots.find((b) => b.bean_id === beanId)?.bean?.name ?? 'Unknown bean',
      suggestion: suggest(stats, profile, goal),
      segments: segments(stats, profile).map((s) => ({ from: s.from, to: s.to, seconds: secondsPerStep(s.slope, goal, DEFAULT_TARGET.time_s) })),
    }
  })
  const selectedId = picked ?? beans[0]?.id

  return (
    <article className="flex flex-col gap-6">
      <h1 className={pageTitle}>{grinder.name}</h1>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className={sectionTitle}>Seconds per step near {DEFAULT_TARGET.time_s} s</h2>
        {beans.some((b) => b.segments.length > 0) ? (
          <GrinderChart series={beans} selectedId={selectedId} coarserIsHigher={profile.slope ? profile.slope > 0 : null} />
        ) : (
          <p className="text-sm text-muted">Brew one bean at two different settings to see how big a step is.</p>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className={sectionTitle}>Where your beans land for 1:{DEFAULT_TARGET.ratio} in {DEFAULT_TARGET.time_s} s</h2>
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

// The setting to aim for, or which way to go when we can't say how far yet.
function landing(s: Suggestion | null): string {
  if (!s) return '–'
  return s.kind === 'direction' ? s.direction : String(s.setting)
}
