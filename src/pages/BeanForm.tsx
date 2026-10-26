import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RoastSwatch from '../components/RoastSwatch'
import StickyActions from '../components/StickyActions'
import { useBeans, useSaveBean, useSetBeanArchived } from '../hooks/useBeans'
import { emptyToNull, friendlyError, todayIso } from '../lib/format'
import { inputClass, labelClass, pageTitle, primaryButton, secondaryButton, sectionTitle, textButton } from '../lib/styles'
import { ROAST_LEVELS, type Bean, type RoastLevel } from '../lib/types'

// Route wrapper: /beans/new (create) or /beans/:id (edit).
export default function BeanForm() {
  const { id } = useParams()
  const beans = useBeans() // same cached list as the Beans page, so usually no network request

  if (!id) return <BeanFormFields />
  if (beans.isLoading) return <p className="text-muted">Loading bean…</p>

  const bean = beans.data?.find((b) => b.id === id)
  if (!bean) return <p className="text-muted">This bean doesn't exist.</p>
  // Readable because a brew uses it, but it's another group's (or a former group's), so RLS blocks edits.
  if (!bean.in_my_list) return <p className="text-muted">This bean belongs to another group, so you can't edit it.</p>

  // Render the form only once the bean is loaded, so its state starts with the right values.
  return <BeanFormFields key={bean.id} initial={bean} />
}

function BeanFormFields({ initial }: { initial?: Bean }) {
  const navigate = useNavigate()
  const save = useSaveBean()
  const setArchived = useSetBeanArchived()

  // One state object for the whole form. Inputs work with strings; '' = empty.
  const [form, setForm] = useState({
    roaster: initial?.roaster ?? '',
    name: initial?.name ?? '',
    origin: initial?.origin ?? '',
    process: initial?.process ?? '',
    roast_level: initial?.roast_level ?? '',
    roast_date: initial?.roast_date ?? '',
    notes: initial?.notes ?? '',
  })

  // Returns an onChange handler that updates one field.
  const update = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [field]: e.target.value })

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate(
      {
        id: initial?.id,
        roaster: emptyToNull(form.roaster),
        name: form.name.trim(),
        origin: emptyToNull(form.origin),
        process: emptyToNull(form.process),
        roast_level: (emptyToNull(form.roast_level) as RoastLevel | null),
        roast_date: emptyToNull(form.roast_date),
        notes: emptyToNull(form.notes),
      },
      { onSuccess: () => navigate('/beans') },
    )
  }

  function toggleArchived() {
    if (!initial) return
    setArchived.mutate({ id: initial.id, archived: !initial.archived }, { onSuccess: () => navigate('/beans') })
  }

  const error = save.error ?? setArchived.error

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <h1 className={pageTitle}>{initial ? 'Edit bean' : 'Add bean'}</h1>

      <section className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="name">Name (required)</label>
          <input id="name" required value={form.name} onChange={update('name')} className={inputClass} placeholder="Kochere Yirgacheffe" />
        </div>

        <div>
          <label className={labelClass} htmlFor="roaster">Roaster</label>
          <input id="roaster" value={form.roaster} onChange={update('roaster')} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="origin">Origin</label>
            <input id="origin" value={form.origin} onChange={update('origin')} className={inputClass} placeholder="Ethiopia" />
          </div>
          <div>
            <label className={labelClass} htmlFor="process">Process</label>
            {/* list= gives suggestions but still allows free text */}
            <input id="process" list="processes" value={form.process} onChange={update('process')} className={inputClass} placeholder="Washed" />
            <datalist id="processes">
              <option value="Washed" />
              <option value="Natural" />
              <option value="Honey" />
              <option value="Anaerobic" />
            </datalist>
          </div>
        </div>
      </section>

      {/* Roast level as swatch chips: you pick the colour you'll see everywhere else. */}
      <fieldset className="flex flex-col gap-2 border-t border-line pt-5">
        <legend className={`${sectionTitle} mb-2`}>Roast</legend>
        <div className="flex flex-wrap gap-2">
          {[...ROAST_LEVELS, ''].map((level) => (
            <label key={level || 'unknown'} className="cursor-pointer">
              <input
                type="radio"
                name="roast_level"
                value={level}
                checked={form.roast_level === level}
                onChange={update('roast_level')}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface pr-4 pl-1.5 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-crema">
                <RoastSwatch level={(level || null) as RoastLevel | null} className="size-8 rounded-full" />
                {level || 'Unknown'}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-2">
          <label className={labelClass} htmlFor="roast_date">Roast date</label>
          <input id="roast_date" type="date" max={todayIso()} value={form.roast_date} onChange={update('roast_date')} className={inputClass} />
        </div>
      </fieldset>

      <section className="border-t border-line pt-5">
        <label className={labelClass} htmlFor="notes">Notes</label>
        <textarea id="notes" rows={3} value={form.notes} onChange={update('notes')} className={inputClass} placeholder="Tasting notes from the bag, price, where you bought it…" />
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 p-3 text-sm text-danger">
          Couldn't save the bean: {friendlyError(error)}
        </p>
      )}

      {initial && (
        <button type="button" onClick={toggleArchived} disabled={setArchived.isPending} className={`${textButton} self-start`}>
          {initial.archived ? 'Move back to current beans' : 'Mark bag as finished'}
        </button>
      )}

      <StickyActions>
        <button type="button" onClick={() => navigate('/beans')} className={secondaryButton}>Cancel</button>
        <button disabled={save.isPending} className={`${primaryButton} flex-1`}>
          {save.isPending ? 'Saving…' : 'Save bean'}
        </button>
      </StickyActions>
    </form>
  )
}
