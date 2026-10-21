import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBeans, useSaveBean, useSetBeanArchived } from '../hooks/useBeans'
import { emptyToNull, friendlyError, todayIso } from '../lib/format'
import { inputClass, labelClass, primaryButton, secondaryButton } from '../lib/styles'
import { ROAST_LEVELS, type Bean, type RoastLevel } from '../lib/types'

// Route wrapper: /beans/new (create) or /beans/:id (edit).
export default function BeanForm() {
  const { id } = useParams()
  const beans = useBeans() // same cached list as the Beans page, so usually no network request

  if (!id) return <BeanFormFields />
  if (beans.isLoading) return <p className="text-stone-500">Loading…</p>

  const bean = beans.data?.find((b) => b.id === id)
  if (!bean) return <p className="text-stone-500">Bean not found.</p>

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
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{initial ? 'Edit bean' : 'New bean'}</h2>

      <div>
        <label className={labelClass} htmlFor="name">Name *</label>
        <input id="name" required value={form.name} onChange={update('name')} className={inputClass} placeholder="e.g. Kochere Yirgacheffe" />
      </div>

      <div>
        <label className={labelClass} htmlFor="roaster">Roaster</label>
        <input id="roaster" value={form.roaster} onChange={update('roaster')} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="origin">Origin</label>
          <input id="origin" value={form.origin} onChange={update('origin')} className={inputClass} placeholder="e.g. Ethiopia" />
        </div>
        <div>
          <label className={labelClass} htmlFor="process">Process</label>
          {/* list= gives suggestions but still allows free text */}
          <input id="process" list="processes" value={form.process} onChange={update('process')} className={inputClass} />
          <datalist id="processes">
            <option value="Washed" />
            <option value="Natural" />
            <option value="Honey" />
            <option value="Anaerobic" />
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="roast_level">Roast level</label>
          <select id="roast_level" value={form.roast_level} onChange={update('roast_level')} className={inputClass}>
            <option value="">–</option>
            {ROAST_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="roast_date">Roast date</label>
          <input id="roast_date" type="date" max={todayIso()} value={form.roast_date} onChange={update('roast_date')} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">Notes</label>
        <textarea id="notes" rows={3} value={form.notes} onChange={update('notes')} className={inputClass} placeholder="Tasting notes from the bag, price, where you bought it…" />
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{friendlyError(error)}</p>}

      <div className="flex gap-2">
        <button disabled={save.isPending} className={`${primaryButton} flex-1`}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => navigate('/beans')} className={secondaryButton}>Cancel</button>
      </div>

      {initial && (
        <button type="button" onClick={toggleArchived} disabled={setArchived.isPending} className="text-sm text-stone-500 underline">
          {initial.archived ? 'Restore from archive' : 'Archive this bean (bag finished)'}
        </button>
      )}
    </form>
  )
}
