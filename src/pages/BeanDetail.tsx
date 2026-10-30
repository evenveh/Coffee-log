import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BeanChart from '../components/BeanChart'
import BeanThumb from '../components/BeanThumb'
import { useBeans } from '../hooks/useBeans'
import { useBrews } from '../hooks/useBrews'
import { useSignedUrls } from '../hooks/usePhotos'
import { DEFAULT_TARGET, grinderProfile, settingStats, shotFlow, suggest, targetFlow, usualDose, type Suggestion } from '../lib/dialIn'
import { daysSince } from '../lib/format'
import { BEAN_PHOTO_BUCKET, thumbPath } from '../lib/photos'
import { listClass, pageTitle, secondaryButton, sectionTitle } from '../lib/styles'

// One bean: its details, and how it grinds on each grinder I've used it with (lib/dialIn.ts).
// Editing is a separate page (/beans/:id/edit), like brews.
export default function BeanDetail() {
  const { id } = useParams()
  const beans = useBeans()
  const brews = useBrews()
  const [picked, setPicked] = useState<string | null>(null) // grinder shown in crema
  const bean = beans.data?.find((b) => b.id === id)
  const photoPath = bean?.photo_path ? thumbPath(bean.photo_path) : null
  const photo = useSignedUrls(photoPath ? [photoPath] : [], BEAN_PHOTO_BUCKET)

  if (beans.isLoading || brews.isLoading) return <p className="text-muted">Loading bean…</p>
  if (!bean) return <p className="text-muted">This bean doesn't exist.</p>
  const all = brews.data ?? []

  // "Ethiopia, washed": a plain phrase instead of dot-separated fragments, as in the bean list.
  const details = [bean.origin, bean.process?.toLowerCase()].filter(Boolean).join(', ')
  const days = bean.roast_date ? daysSince(bean.roast_date) : null

  // My espresso shots with this bean, newest first, scaled to the dose I usually use for it.
  const shots = all.filter((b) => b.bean_id === bean.id && b.grinder_id && b.grind_setting != null && shotFlow(b) != null)
  const dose = usualDose(shots)

  // One line per grinder, the most recently used first.
  const grinderIds = [...new Set(shots.map((b) => b.grinder_id!))]
  const lines = dose
    ? grinderIds.map((grinderId) => {
        const stats = settingStats(all, bean.id, grinderId, dose)
        const profile = grinderProfile(all, grinderId, dose)
        return {
          id: grinderId,
          name: shots.find((b) => b.grinder_id === grinderId)?.grinder?.name ?? 'Unknown grinder',
          slope: profile.slope,
          precision: profile.precision,
          suggestion: suggest(stats, profile, targetFlow(DEFAULT_TARGET, dose)),
          averages: stats.map((s) => ({ setting: s.setting, time: (dose * DEFAULT_TARGET.ratio) / s.flow, shots: s.shots })),
        }
      })
    : []
  const selected = lines.find((l) => l.id === picked) ?? lines[0]

  return (
    <article className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <BeanThumb url={photo.data?.[photoPath ?? '']} level={bean.roast_level} className="size-20 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h1 className={pageTitle}>{bean.name}</h1>
          {bean.roaster && <p className="text-muted">{bean.roaster}</p>}
          {(details || bean.archived) && (
            <p className="text-sm text-muted">
              {details}
              {bean.archived && (details ? ', finished' : 'Finished')}
            </p>
          )}
        </div>
        {days !== null && (
          <p className="flex shrink-0 flex-col items-end">
            <span className="num text-3xl leading-none">{days}</span>
            <span className="text-xs text-muted">days off roast</span>
          </p>
        )}
      </div>

      {bean.notes && <p className="whitespace-pre-line">{bean.notes}</p>}

      {/* Readable because a brew uses it, but another group's: RLS blocks edits, so no button. */}
      {bean.in_my_list && <Link to={`/beans/${bean.id}/edit`} className={`${secondaryButton} self-start`}>Edit</Link>}

      {selected && (
        <section className="flex flex-col gap-3 border-t border-line pt-5">
          <div>
            <h2 className={sectionTitle}>Grind profile</h2>
            {/* The chart's times depend on the ratio and dose, so say which. */}
            <p className="text-sm text-muted">Time for 1:{DEFAULT_TARGET.ratio} at {dose} g</p>
          </div>
          <BeanChart
            series={lines}
            selectedId={selected.id}
            targetTime={DEFAULT_TARGET.time_s}
            ideal={selected.suggestion && selected.suggestion.kind !== 'direction' ? selected.suggestion.setting : null}
            coarserIsHigher={selected.slope ? selected.slope > 0 : null}
            precision={selected.precision}
          />

          <ul className={listClass}>
            {lines.map((l) => (
              <li key={l.id}>
                {/* The rows double as the chart's legend: the line key matches how the grinder is drawn. */}
                <button onClick={() => setPicked(l.id)} aria-pressed={l.id === selected.id} className="flex min-h-11 w-full items-center gap-3 py-1 text-left">
                  <span className={`h-0.5 w-4 shrink-0 rounded-full ${l.id === selected.id ? 'bg-crema' : 'bg-muted opacity-35'}`} />
                  <span className={`flex-1 ${l.id === selected.id ? 'font-semibold' : ''}`}>{l.name}</span>
                  <span className="num text-xl">{landing(l.suggestion)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

// The setting to aim for, or which way to go when we can't say how far yet.
function landing(s: Suggestion | null): string {
  if (!s) return '–'
  return s.kind === 'direction' ? s.direction : String(s.setting)
}
