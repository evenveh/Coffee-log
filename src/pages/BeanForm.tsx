import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BeanThumb from '../components/BeanThumb'
import RoastBean from '../components/RoastBean'
import StickyActions from '../components/StickyActions'
import { useBeans, useSaveBean, useSetBeanArchived, useSetBeanPhoto } from '../hooks/useBeans'
import { useSignedUrls } from '../hooks/usePhotos'
import { emptyToNull, friendlyError, todayIso } from '../lib/format'
import { BEAN_PHOTO_BUCKET, thumbPath } from '../lib/photos'
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
  const setPhoto = useSetBeanPhoto()
  // undefined = keep the saved photo, null = remove it, File = replace it. Applied on save.
  const [photo, setPhotoChoice] = useState<File | null>()
  const photoChanged = photo instanceof File || (photo === null && !!initial?.photo_path)

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
      {
        // The bean now exists and has an id, so the photo can be stored under it.
        onSuccess: async (beanId) => {
          if (photoChanged) {
            try {
              await setPhoto.mutateAsync({ bean: { id: beanId, photo_path: initial?.photo_path ?? null }, file: photo ?? null })
            } catch (err) {
              // The bean is saved, so don't stay here (saving a new bean again would duplicate it).
              window.alert(`The bean was saved, but the photo couldn't be updated: ${friendlyError(err)}\nYou can try again from the bean's page.`)
            }
          }
          navigate('/beans')
        },
      },
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

      <BeanPhotoField
        savedPath={initial?.photo_path ?? null}
        level={(emptyToNull(form.roast_level) as RoastLevel | null)}
        value={photo}
        onChange={setPhotoChoice}
      />

      {/* Roast level as bean chips: you pick the colour you'll see everywhere else. */}
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
                <RoastBean level={(level || null) as RoastLevel | null} className="size-8" />
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
        <button disabled={save.isPending || setPhoto.isPending} className={`${primaryButton} flex-1`}>
          {save.isPending || setPhoto.isPending ? 'Saving…' : 'Save bean'}
        </button>
      </StickyActions>
    </form>
  )
}

type PhotoFieldProps = {
  savedPath: string | null
  level: RoastLevel | null
  value: File | null | undefined // see the photo state in BeanFormFields
  onChange: (value: File | null) => void
}

// Add, change or remove the bag photo. Controlled: the form owns the choice and applies it on save.
function BeanPhotoField({ savedPath, level, value, onChange }: PhotoFieldProps) {
  const saved = useSignedUrls(savedPath ? [thumbPath(savedPath)] : [], BEAN_PHOTO_BUCKET)
  const [pickedUrl, setPickedUrl] = useState<string>()

  // A temporary local address for the picked file, released when it changes
  // (same pattern, and same reason for the effect, as the preview in PendingPhotos).
  useEffect(() => {
    if (!(value instanceof File)) return
    const objectUrl = URL.createObjectURL(value)
    // oxlint-disable-next-line react/set-state-in-effect
    setPickedUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [value])

  const url = value instanceof File ? pickedUrl : value === null ? undefined : saved.data?.[thumbPath(savedPath ?? '')]
  const hasPhoto = value instanceof File || (value === undefined && savedPath !== null)

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onChange(file)
    e.target.value = '' // reset, so picking the same file again still fires onChange
  }

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5">
      <h2 className={sectionTitle}>Photo</h2>
      <div className="flex items-center gap-4">
        <BeanThumb url={url} level={level} className="size-24 rounded-lg" />
        <div className="flex flex-col items-start gap-1">
          <label className={`${secondaryButton} cursor-pointer text-sm`}>
            {hasPhoto ? 'Change photo' : 'Add photo'}
            <input type="file" accept="image/*" onChange={onPick} className="hidden" />
          </label>
          {hasPhoto && (
            <button type="button" onClick={() => onChange(null)} className={textButton}>Remove photo</button>
          )}
        </div>
      </div>
      {value instanceof File && <p className="text-sm text-muted">Uploaded when you save the bean.</p>}
      {value === null && savedPath && <p className="text-sm text-muted">Removed when you save the bean.</p>}
    </section>
  )
}
