import { useBrews } from '../hooks/useBrews'
import { DEFAULT_TARGET, grinderProfile, predictFlow, settingStats, suggest, targetFlow, type Suggestion } from '../lib/dialIn'

type Props = {
  beanId: string
  grinderId: string
  dose: number | null // from the form; empty or unreadable falls back to my last dose
  setting: number | null // from the form, for the expected time
}

// In Log brew: which grind setting to try for this bean, learned from my earlier shots (lib/dialIn.ts).
// Shows nothing until there's at least one shot with this bean and grinder. Kept to the answer only:
// how it was worked out (confidence, shots, dose scaling) belongs on a page for the curious, not in the form.
export default function DialInHint({ beanId, grinderId, dose, setting }: Props) {
  const brews = useBrews()
  if (!brews.data) return null

  // || rather than ??: an unreadable dose field gives NaN, which should fall back too.
  // brews.data is newest first, so find() gives my latest dose with this bean and grinder.
  const doseG = dose || brews.data.find((b) => b.bean_id === beanId && b.grinder_id === grinderId && b.dose_g)?.dose_g
  if (!doseG) return null

  const stats = settingStats(brews.data, beanId, grinderId, doseG)
  const profile = grinderProfile(brews.data, grinderId, doseG)
  const suggestion = suggest(stats, profile, targetFlow(DEFAULT_TARGET, doseG))
  if (!suggestion) return null

  // Time for the target ratio at the setting typed in the form: yield / flow.
  const flow = setting != null && !Number.isNaN(setting) ? predictFlow(stats, profile, setting) : null
  const expected = flow ? Math.round((doseG * DEFAULT_TARGET.ratio) / flow) : null

  return (
    <div aria-live="polite" className="flex flex-col gap-0.5 text-sm">
      <Headline suggestion={suggestion} goal={`1:${DEFAULT_TARGET.ratio} in ${DEFAULT_TARGET.time_s} s`} />
      {expected !== null && (
        <p>At <span className="num text-base">{setting}</span>, 1:{DEFAULT_TARGET.ratio} takes about <span className="num text-base">{expected} s</span></p>
      )}
    </div>
  )
}

function Headline({ suggestion: s, goal }: { suggestion: Suggestion; goal: string }) {
  switch (s.kind) {
    case 'on-target':
      return <p>Your shots at <span className="num text-xl">{s.setting}</span> already hit {goal}. Keep it there.</p>
    case 'setting':
      return <p>For {goal}, try <span className="num text-xl">{s.setting}</span></p>
    case 'direction':
      return <p>Your shots on this bean run {s.direction === 'finer' ? 'fast' : 'slow'} for {goal}. Grind {s.direction}.</p>
  }
}
