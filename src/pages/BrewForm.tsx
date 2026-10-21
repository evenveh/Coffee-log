import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PendingPhotos from '../components/PendingPhotos'
import RoastSwatch from '../components/RoastSwatch'
import ScoreInput from '../components/ScoreInput'
import StickyActions from '../components/StickyActions'
import { useBeans } from '../hooks/useBeans'
import { useBrew, useBrews, useSaveBrew } from '../hooks/useBrews'
import { useNamedList } from '../hooks/useNamedList'
import { useUploadPhotos } from '../hooks/usePhotos'
import { DRINK_TYPES, drinkInfo, type DrinkType } from '../lib/drinkTypes'
import { daysSince, emptyToNull, formatDateTime, formatRatio, friendlyError, parseNumber, toLocalInput } from '../lib/format'
import { inputClass, labelClass, pageTitle, primaryButton, secondaryButton, sectionTitle } from '../lib/styles'
import type { Brew } from '../lib/types'

// Route wrapper: /brews/new, /brews/new?from=<id> (copy a brew), /brews/:id/edit.
export default function BrewForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const fromId = searchParams.get('from')
  const brews = useBrews()
  const existing = useBrew(id)

  if (id) {
    if (existing.isLoading) return <p className="text-stone-500">Loading…</p>
    if (!existing.data) return <p className="text-stone-500">Brew not found.</p>
    return <BrewFormFields key={id} initial={existing.data} />
  }

  if (fromId && brews.isLoading) return <p className="text-stone-500">Loading…</p>
  const copyFrom = brews.data?.find((b) => b.id === fromId)
  return <BrewFormFields key={fromId ?? 'new'} copyFrom={copyFrom} lastBrew={brews.data?.[0]} />
}

// ---------------------------------------------------------------------------
// Form state: text fields are strings (what inputs give us), scores are numbers.

type FormState = {
  brewed_at: string
  drink_type: DrinkType
  bean_id: string
  grinder_id: string
  grind_setting: string
  dose_g: string
  yield_g: string
  time_s: string
  water_temp_c: string
  milk_id: string
  rating_overall: number | null
  sweetness: number | null
  acidity: number | null
  bitterness: number | null
  body: number | null
  latte_art_rating: number | null
  notes: string
}

const str = (n: number | null | undefined) => (n == null ? '' : String(n))

// "What went in" — the part that Copy last brew copies.
function recipeFields(brew?: Brew) {
  return {
    drink_type: brew?.drink_type ?? ('espresso' as DrinkType),
    bean_id: brew?.bean_id ?? '',
    grinder_id: brew?.grinder_id ?? '',
    grind_setting: str(brew?.grind_setting),
    dose_g: str(brew?.dose_g),
    yield_g: str(brew?.yield_g),
    time_s: str(brew?.time_s),
    water_temp_c: str(brew?.water_temp_c),
    milk_id: brew?.milk_id ?? '',
  }
}

// "How it tasted" — never copied.
function tasteFields(brew?: Brew) {
  return {
    rating_overall: brew?.rating_overall ?? null,
    sweetness: brew?.sweetness ?? null,
    acidity: brew?.acidity ?? null,
    bitterness: brew?.bitterness ?? null,
    body: brew?.body ?? null,
    latte_art_rating: brew?.latte_art_rating ?? null,
    notes: brew?.notes ?? '',
  }
}

const NUMBER_LABELS = {
  grind_setting: 'Grind setting',
  dose_g: 'Dose',
  yield_g: 'Yield',
  time_s: 'Time',
  water_temp_c: 'Water temp',
} as const

// ---------------------------------------------------------------------------

type FieldsProps = {
  initial?: Brew // editing this brew
  copyFrom?: Brew // new brew, prefilled with this brew's recipe
  lastBrew?: Brew // for the "Copy last brew" button
}

function BrewFormFields({ initial, copyFrom, lastBrew }: FieldsProps) {
  const navigate = useNavigate()
  const save = useSaveBrew()
  const beans = useBeans()
  const grinders = useNamedList('grinders')
  const milks = useNamedList('milks')
  const [formError, setFormError] = useState<string | null>(null)
  const upload = useUploadPhotos()
  const [photos, setPhotos] = useState<File[]>([]) // picked, not uploaded yet

  const [form, setForm] = useState<FormState>(() => ({
    brewed_at: toLocalInput(initial?.brewed_at ?? new Date().toISOString()),
    ...recipeFields(initial ?? copyFrom),
    ...tasteFields(initial),
  }))

  // Update one field. The generic <K> makes TypeScript check that the value fits the field.
  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }
  const text = (field: keyof FormState) => (e: { target: { value: string } }) => set(field, e.target.value)

  // Derived values: recalculated on every render, never stored.
  const info = drinkInfo(form.drink_type)
  const isFilter = info.category === 'filter'
  const ratio = formatRatio(parseNumber(form.dose_g), parseNumber(form.yield_g))
  const selectedBean = beans.data?.find((b) => b.id === form.bean_id)
  const daysOff = selectedBean?.roast_date ? daysSince(selectedBean.roast_date, new Date(form.brewed_at)) : null

  // Hide archived items, except the one already chosen (when editing an old brew).
  const active = <T extends { id: string; archived: boolean }>(items: T[] | undefined, chosen: string) =>
    (items ?? []).filter((i) => !i.archived || i.id === chosen)

  function submit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (form.rating_overall === null) return setFormError('Give it an overall score.')

    const numbers = {
      grind_setting: parseNumber(form.grind_setting),
      dose_g: parseNumber(form.dose_g),
      yield_g: parseNumber(form.yield_g),
      time_s: parseNumber(form.time_s),
      water_temp_c: parseNumber(form.water_temp_c),
    }
    const bad = (Object.keys(numbers) as (keyof typeof numbers)[]).find((k) => Number.isNaN(numbers[k]))
    if (bad) return setFormError(`${NUMBER_LABELS[bad]} must be a number.`)

    save.mutate(
      {
        id: initial?.id,
        brewed_at: new Date(form.brewed_at).toISOString(),
        drink_type: form.drink_type,
        bean_id: form.bean_id || null,
        grinder_id: form.grinder_id || null,
        ...numbers,
        // Milk fields only count for milk drinks, even if something was picked earlier.
        milk_id: info.milk ? form.milk_id || null : null,
        latte_art_rating: info.milk ? form.latte_art_rating : null,
        rating_overall: form.rating_overall,
        sweetness: form.sweetness,
        acidity: form.acidity,
        bitterness: form.bitterness,
        body: form.body,
        notes: emptyToNull(form.notes),
      },
      {
        // The brew now exists and has an id, so the photos can be uploaded under it.
        onSuccess: async (brewId) => {
          if (photos.length > 0) {
            try {
              await upload.mutateAsync({ brewId, files: photos })
            } catch (err) {
              // The brew is saved, so don't stay here (saving again would duplicate it).
              window.alert(`The brew was saved, but the photo upload failed: ${friendlyError(err)}\nYou can add the photos from the brew's page.`)
            }
          }
          navigate(`/brews/${brewId}`, { replace: true })
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className={pageTitle}>{initial ? 'Edit brew' : 'Log brew'}</h1>
          {!initial && lastBrew && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, ...recipeFields(lastBrew) }))}
              className="min-h-11 text-sm text-crema-ink underline underline-offset-2"
            >
              Copy last brew
            </button>
          )}
        </div>
        {copyFrom && <p className="text-sm text-muted">Recipe copied from {formatDateTime(copyFrom.brewed_at)}.</p>}
      </div>

      {/* ---------------- Drink ---------------- */}
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Drink</legend>
        <DrinkChips group="Espresso" category="espresso" value={form.drink_type} onChange={(v) => set('drink_type', v)} />
        <DrinkChips group="Filter" category="filter" value={form.drink_type} onChange={(v) => set('drink_type', v)} />
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="brewed_at">When</label>
        <input id="brewed_at" type="datetime-local" required value={form.brewed_at} onChange={text('brewed_at')} className={inputClass} />
      </div>

      {/* ---------------- Recipe ---------------- */}
      <section className={section}>
        <h2 className={sectionTitle}>Recipe</h2>

        <div>
          <label className={labelClass} htmlFor="bean_id">Bean</label>
          <div className="flex items-center gap-2">
            <RoastSwatch level={selectedBean?.roast_level} className="size-11 rounded-lg" />
            <select id="bean_id" value={form.bean_id} onChange={text('bean_id')} className={inputClass}>
              <option value="">No bean selected</option>
              {active(beans.data, form.bean_id).map((b) => (
                <option key={b.id} value={b.id}>{b.roaster ? `${b.name} (${b.roaster})` : b.name}</option>
              ))}
            </select>
          </div>
          {daysOff !== null && !Number.isNaN(daysOff) && <p className="mt-1 text-sm text-crema-ink">{daysOff} days off roast</p>}
          {beans.data?.length === 0 && (
            <p className="mt-1 text-sm text-muted">The bean list is empty. <Link to="/beans/new" className="text-ink underline">Add a bean</Link></p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField id="dose_g" label="Dose (g)" value={form.dose_g} onChange={text('dose_g')} placeholder={isFilter ? '15' : '18'} />
          <NumberField id="yield_g" label={isFilter ? 'Water (g)' : 'Yield (g)'} value={form.yield_g} onChange={text('yield_g')} placeholder={isFilter ? '250' : '36'} />
          {/* Phone number pads have no ":" key, so filter times get the normal keyboard. */}
          <NumberField id="time_s" label={isFilter ? 'Brew time (m:ss)' : 'Time (s)'} value={form.time_s} onChange={text('time_s')} placeholder={isFilter ? '3:00' : '28'} keyboard={isFilter ? 'text' : 'decimal'} />
          <NumberField id="water_temp_c" label="Water temp (°C)" value={form.water_temp_c} onChange={text('water_temp_c')} placeholder={isFilter ? '96' : '93'} />
        </div>
        {/* Live: recalculated on every keystroke because the form re-renders. */}
        <p className="flex items-baseline gap-2" aria-live="polite">
          <span className="text-sm text-muted">Ratio</span>
          <span className="num text-2xl text-crema-ink">{ratio ?? '–'}</span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="grinder_id">Grinder</label>
            <select id="grinder_id" value={form.grinder_id} onChange={text('grinder_id')} className={inputClass}>
              <option value="">None</option>
              {active(grinders.data, form.grinder_id).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <NumberField id="grind_setting" label="Grind setting" value={form.grind_setting} onChange={text('grind_setting')} placeholder="14" />
        </div>

        {info.milk && (
          <div>
            <label className={labelClass} htmlFor="milk_id">Milk</label>
            <select id="milk_id" value={form.milk_id} onChange={text('milk_id')} className={inputClass}>
              <option value="">None</option>
              {active(milks.data, form.milk_id).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* ---------------- Taste ---------------- */}
      <section className={section}>
        <h2 className={sectionTitle}>Taste</h2>
        <ScoreInput label="Overall" required value={form.rating_overall} onChange={(v) => set('rating_overall', v)} />
        {info.milk && (
          <ScoreInput label="Latte art" value={form.latte_art_rating} onChange={(v) => set('latte_art_rating', v)} />
        )}

        {/* <details> is a built-in collapsible section. Open it if any sub-score is already set. */}
        <details open={[form.sweetness, form.acidity, form.bitterness, form.body].some((v) => v !== null)}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted">Sweetness, acidity, bitterness and body</summary>
          <div className="mt-2 flex flex-col gap-4">
            <ScoreInput label="Sweetness" value={form.sweetness} onChange={(v) => set('sweetness', v)} />
            <ScoreInput label="Acidity" value={form.acidity} onChange={(v) => set('acidity', v)} />
            <ScoreInput label="Bitterness" value={form.bitterness} onChange={(v) => set('bitterness', v)} />
            <ScoreInput label="Body" value={form.body} onChange={(v) => set('body', v)} />
          </div>
        </details>

        <div>
          <label className={labelClass} htmlFor="notes">Notes</label>
          <textarea id="notes" rows={3} value={form.notes} onChange={text('notes')} className={inputClass} placeholder="Chocolatey, a bit sour, channeled…" />
        </div>
      </section>

      {/* ---------------- Photos ---------------- */}
      <section className={section}>
        <PendingPhotos files={photos} onChange={setPhotos} />
      </section>

      {(formError || save.error) && (
        <p role="alert" className="rounded-lg border border-danger/40 p-3 text-sm text-danger">
          {formError ?? `Couldn't save the brew: ${friendlyError(save.error)}`}
        </p>
      )}

      <StickyActions>
        <button type="button" onClick={() => navigate(-1)} className={secondaryButton}>Cancel</button>
        <button disabled={save.isPending || upload.isPending} className={`${primaryButton} flex-1`}>
          {upload.isPending ? 'Uploading photos…' : save.isPending ? 'Saving…' : 'Save brew'}
        </button>
      </StickyActions>
    </form>
  )
}

// A section of the form: a hairline above it instead of a card around it.
const section = 'flex flex-col gap-4 border-t border-line pt-5'

// One group of drink-type chips. They are real radio buttons (hidden with sr-only), so
// arrow keys and screen readers work; the visible chip is styled with peer-checked.
function DrinkChips(props: { group: string; category: 'espresso' | 'filter'; value: DrinkType; onChange: (v: DrinkType) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-muted">{props.group}</p>
      <div className="flex flex-wrap gap-2">
        {DRINK_TYPES.filter((d) => d.category === props.category).map((d) => (
          <label key={d.value} className="cursor-pointer">
            <input
              type="radio"
              name="drink_type"
              value={d.value}
              checked={props.value === d.value}
              onChange={() => props.onChange(d.value)}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-crema">
              {d.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// A text input for numbers, shown in the condensed recipe numerals.
// type="text" (the default) so commas and "3:30" are allowed; inputMode picks the keyboard.
type NumberFieldProps = {
  id: string
  label: string
  value: string
  onChange: (e: { target: { value: string } }) => void
  placeholder?: string
  keyboard?: 'decimal' | 'text'
}

function NumberField(props: NumberFieldProps) {
  return (
    <div>
      <label className={labelClass} htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        inputMode={props.keyboard ?? 'decimal'}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        className={`${inputClass} num text-2xl`}
      />
    </div>
  )
}
