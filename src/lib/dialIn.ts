// Dial-in maths for espresso. Learns how flow (grams out per second) changes with the
// grind setting, per bean and per grinder, and suggests the next setting to try.
// Works for any grinder: a setting is just a number that goes up evenly. Which way is
// finer, and how precisely settings are logged, is learned from the user's own brews.
// Pass only the user's own brews (useBrews): a friend's grinder and machine behave differently.
import { drinkInfo } from './drinkTypes'
import type { Brew } from './types'

// What a good shot looks like: 1:2 in 30 s. A ratio, not grams, so it works for any dose.
export type Target = { ratio: number; time_s: number }
export const DEFAULT_TARGET: Target = { ratio: 2, time_s: 30 }

// Within this share of the target flow counts as on target (0.05 = 5 %, about ±1.5 s at 30 s).
export const ON_TARGET = 0.05

// One grind setting on one bean: how many shots, and their average flow in g/s,
// scaled to the dose passed to settingStats.
export type SettingStat = { setting: number; shots: number; flow: number }

export type GrinderProfile = {
  // Change in flow (g/s) per +1 on the dial, averaged over beans. Positive = higher numbers
  // are coarser. null until some bean has been brewed at two or more settings.
  slope: number | null
  // Decimals the user logs settings with on this grinder (1.5 -> 1), for rounding suggestions.
  precision: number
}

export type Suggestion =
  | { kind: 'on-target'; setting: number }
  | { kind: 'setting'; setting: number; confidence: 'good' | 'medium' | 'low' }
  | { kind: 'direction'; direction: 'finer' | 'coarser' } // we know which way, not how far

// Grams per second, or null when it's not an espresso drink or yield/time is missing.
export function shotFlow(brew: Brew): number | null {
  if (drinkInfo(brew.drink_type).category !== 'espresso') return null
  if (brew.yield_g == null || !brew.time_s) return null
  return brew.yield_g / brew.time_s
}

// The flow that hits the target with this dose: 18 g at 1:2 in 30 s -> 1.2 g/s.
export function targetFlow(target: Target, dose_g: number): number {
  return (dose_g * target.ratio) / target.time_s
}

// A shot's flow as if it had been pulled with dose_g (the dose you're using now). Assumes
// flow ∝ 1 / dose: in the same basket a bigger dose makes a taller puck, and water flows
// through it more slowly (Darcy's law). Ignores pre-infusion and puck compression.
// Shots without a dose aren't scaled.
export function scaledFlow(brew: Brew, dose_g: number): number | null {
  const flow = shotFlow(brew)
  return flow == null ? null : (flow * (brew.dose_g ?? dose_g)) / dose_g
}

// One entry per setting used with this bean and grinder, sorted from low to high setting.
// Flows are scaled to dose_g (see scaledFlow).
export function settingStats(brews: Brew[], beanId: string, grinderId: string, dose_g: number): SettingStat[] {
  const flows = new Map<number, number[]>()
  for (const b of brews) {
    const flow = scaledFlow(b, dose_g)
    if (b.bean_id !== beanId || b.grinder_id !== grinderId || b.grind_setting == null || flow == null) continue
    flows.set(b.grind_setting, [...(flows.get(b.grind_setting) ?? []), flow])
  }
  return [...flows]
    .map(([setting, fs]) => ({ setting, shots: fs.length, flow: fs.reduce((a, f) => a + f, 0) / fs.length }))
    .sort((a, b) => a.setting - b.setting)
}

// What this grinder has taught us across all beans brewed on it, at dose_g (see settingStats).
export function grinderProfile(brews: Brew[], grinderId: string, dose_g: number): GrinderProfile {
  const mine = brews.filter((b) => b.grinder_id === grinderId && b.grind_setting != null)
  const precision = Math.max(0, ...mine.map((b) => decimals(b.grind_setting!)))

  // A slope per bean (the bean is held fixed, so only the grinder changes), then their average.
  const beanIds = new Set(mine.map((b) => b.bean_id).filter((id): id is string => id != null))
  const slopes = [...beanIds]
    .map((id) => settingStats(brews, id, grinderId, dose_g))
    .filter((stats) => stats.length >= 2)
    .map(slopeOf)
  const slope = slopes.length > 0 ? slopes.reduce((a, s) => a + s, 0) / slopes.length : null

  return { slope, precision }
}

// Suggest the setting for the next shot, or null when there are no shots on this bean yet.
// goal is the flow to aim for, from targetFlow().
export function suggest(stats: SettingStat[], profile: GrinderProfile, goal: number): Suggestion | null {
  if (stats.length === 0) return null

  // Start from the measured setting whose flow is closest to the goal.
  const nearest = stats.reduce((a, b) => (Math.abs(b.flow - goal) < Math.abs(a.flow - goal) ? b : a))
  if (Math.abs(nearest.flow - goal) / goal <= ON_TARGET) return { kind: 'on-target', setting: nearest.setting }

  // 1. Two neighbouring settings with the goal between their flows: read it off the line between them.
  for (let i = 0; i + 1 < stats.length; i++) {
    const [a, b] = [stats[i], stats[i + 1]]
    if ((a.flow - goal) * (b.flow - goal) < 0) {
      const setting = a.setting + ((goal - a.flow) * (b.setting - a.setting)) / (b.flow - a.flow)
      return { kind: 'setting', setting: roundTo(setting, profile.precision), confidence: 'good' }
    }
  }

  // 2. Otherwise extend a line from the nearest setting (slope from lineSlope). No cap on the jump:
  //    a step means something different on every grinder, so the confidence says how far to trust it.
  const { slope, fromBean } = lineSlope(stats, profile)
  if (slope) {
    const setting = nearest.setting + (goal - nearest.flow) / slope
    return { kind: 'setting', setting: roundTo(setting, profile.precision), confidence: fromBean ? 'medium' : 'low' }
  }

  // 3. No slope yet (a new grinder): we only know the shot ran fast or slow.
  return { kind: 'direction', direction: nearest.flow > goal ? 'finer' : 'coarser' }
}

// The flow (g/s, at the dose stats were scaled to) to expect at a setting: the opposite of suggest().
// null when there's no way to tell, or when a line extended this far gives no flow at all.
export function predictFlow(stats: SettingStat[], profile: GrinderProfile, setting: number): number | null {
  if (stats.length === 0) return null

  // A setting I've brewed at: use what I measured.
  const exact = stats.find((s) => s.setting === setting)
  if (exact) return exact.flow

  // Between two neighbouring settings: go the same share of the way from one flow to the other.
  for (let i = 0; i + 1 < stats.length; i++) {
    const [a, b] = [stats[i], stats[i + 1]]
    if (a.setting < setting && setting < b.setting) {
      return a.flow + ((setting - a.setting) * (b.flow - a.flow)) / (b.setting - a.setting)
    }
  }

  // Outside what I've tried: extend a line from the closest end (stats is sorted by setting).
  const nearest = setting < stats[0].setting ? stats[0] : stats[stats.length - 1]
  const { slope } = lineSlope(stats, profile)
  if (!slope) return null
  const flow = nearest.flow + (setting - nearest.setting) * slope
  return flow > 0 ? flow : null
}

// How many shots of evidence the grinder's slope counts as when blended with the bean's own.
export const GRINDER_WEIGHT = 4

// Which slope to extend a line with: the bean's own and the grinder's, blended by how much
// data the bean has ("shrinkage"). With 4 shots on the bean it's 50/50, with 12 it's 75 % bean.
// A bean slope pointing the other way from the grinder's is noise (or an ageing bean), so it's not used.
function lineSlope(stats: SettingStat[], profile: GrinderProfile): { slope: number | null; fromBean: boolean } {
  const bean = stats.length >= 2 ? slopeOf(stats) : null
  const fromBean = bean !== null && bean !== 0 && (profile.slope === null || Math.sign(bean) === Math.sign(profile.slope))
  if (!fromBean) return { slope: profile.slope, fromBean }
  if (profile.slope === null) return { slope: bean, fromBean }

  const shots = stats.reduce((a, s) => a + s.shots, 0)
  const w = shots / (shots + GRINDER_WEIGHT)
  return { slope: w * bean + (1 - w) * profile.slope, fromBean }
}

// Least-squares slope of flow against setting: how much flow changes per +1 on the dial.
export function slopeOf(points: SettingStat[]): number {
  const mx = points.reduce((a, p) => a + p.setting, 0) / points.length
  const my = points.reduce((a, p) => a + p.flow, 0) / points.length
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.setting - mx) * (p.flow - my)
    den += (p.setting - mx) ** 2
  }
  return num / den
}

// Round to a number of decimals: roundTo(-1.64, 1) -> -1.6.
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

// Decimals in a logged setting: 2 -> 0, -1.1 -> 1. Capped at 2, like the database column.
function decimals(n: number): number {
  return Math.min(2, (String(n).split('.')[1] ?? '').length)
}
