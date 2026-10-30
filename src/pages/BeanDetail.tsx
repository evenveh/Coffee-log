import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BeanChart from '../components/BeanChart'
import BeanThumb from '../components/BeanThumb'
import DialInHint from '../components/DialInHint'
import { useBeans } from '../hooks/useBeans'
import { useBrews } from '../hooks/useBrews'
import { useSignedUrls } from '../hooks/usePhotos'
import { DEFAULT_TARGET, grinderProfile, settingStats, shotFlow, suggest, targetFlow, usualDose, type Suggestion } from '../lib/dialIn'
import { daysSince, parseNumber } from '../lib/format'
import { BEAN_PHOTO_BUCKET, thumbPath } from '../lib/photos'
import { inputClass, labelClass, listClass, pageTitle, secondaryButton, sectionTitle } from '../lib/styles'

// One bean: its details, and how it grinds on each grinder I've used it with (lib/dialIn.ts).
// Editing is a separate page (/beans/:id/edit), like brews.
export default function BeanDetail() {
  const { id } = useParams()
  const beans = useBeans()
  const brews = useBrews()
  const [picked, setPicked] = useState<string | null>(null) // grinder shown in crema
  // Find a setting: a dose and target time to plan the next shot with. Never saved; empty = default.
  const [plan, setPlan] = useState({ dose: '', time: '' })
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
            <p className="text-sm text-muted">Estimated time for 1:{DEFAULT_TARGET.ratio} at {dose} g, from the flow rate of your earlier shots</p>
          </div>
          <BeanChart
            series={lines}
            selectedId={selected.id}
            targetTime={DEFAULT_TARGET.time_s}
            ratio={DEFAULT_TARGET.ratio}
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

      {/* The same hint as in Log brew, for the grinder picked above, with my own dose and time. */}
      {selected && dose && (
        <section className="flex flex-col gap-3 border-t border-line pt-5">
          <h2 className={sectionTitle}>Find a setting</h2>
          <div className="grid grid-cols-2 gap-3">
            <PlanField id="plan-dose" label="Dose (g)" value={plan.dose} max={PLAN_LIMITS.dose} placeholder={String(dose)} onChange={(v) => setPlan((p) => ({ ...p, dose: v }))} />
            <PlanField id="plan-time" label="Time (s)" value={plan.time} max={PLAN_LIMITS.time} placeholder={String(DEFAULT_TARGET.time_s)} onChange={(v) => setPlan((p) => ({ ...p, time: v }))} />
          </div>
          <DialInHint beanId={bean.id} grinderId={selected.id} dose={parseNumber(plan.dose) || dose} time={parseNumber(plan.time)} setting={null} />
        </section>
      )}
    </article>
  )
}

// The most the Find a setting fields accept. Beyond these the answer is all model and no measurement.
const PLAN_LIMITS = { dose: 40, time: 120 }

// One small number input. Typing past max sets it to max, so the field shows what's used.
// The placeholder shows the default that an empty field falls back to.
function PlanField(props: { id: string; label: string; value: string; max: number; placeholder: string; onChange: (value: string) => void }) {
  function change(e: { target: { value: string } }) {
    const n = parseNumber(e.target.value)
    props.onChange(n && n > props.max ? String(props.max) : e.target.value)
  }
  return (
    <div>
      <label className={labelClass} htmlFor={props.id}>{props.label}</label>
      <input id={props.id} inputMode="decimal" value={props.value} onChange={change} placeholder={props.placeholder} className={`${inputClass} num text-xl`} />
    </div>
  )
}

// The setting to aim for, or which way to go when we can't say how far yet.
function landing(s: Suggestion | null): string {
  if (!s) return '–'
  return s.kind === 'direction' ? s.direction : String(s.setting)
}
