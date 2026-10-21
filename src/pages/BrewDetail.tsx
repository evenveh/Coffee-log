import { Link, useNavigate, useParams } from 'react-router-dom'
import PhotoGallery from '../components/PhotoGallery'
import { useBrew, useDeleteBrew } from '../hooks/useBrews'
import { drinkInfo } from '../lib/drinkTypes'
import { daysSince, formatDateTime, formatDuration, formatRatio, friendlyError } from '../lib/format'
import { card, primaryButton, secondaryButton } from '../lib/styles'

export default function BrewDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const brew = useBrew(id)
  const remove = useDeleteBrew()

  if (brew.isLoading) return <p className="text-stone-500">Loading…</p>
  if (!brew.data) return <p className="text-stone-500">Brew not found.</p>
  const b = brew.data

  const info = drinkInfo(b.drink_type)
  const isFilter = info.category === 'filter'

  // [label, value] pairs; rows with no value are skipped when rendering.
  const recipe: [string, string | null][] = [
    ['Bean', b.bean && (b.bean.roaster ? `${b.bean.roaster} – ${b.bean.name}` : b.bean.name)],
    ['Days off roast', b.bean?.roast_date ? String(daysSince(b.bean.roast_date, new Date(b.brewed_at))) : null],
    ['Grinder', [b.grinder?.name, b.grind_setting !== null && `@ ${b.grind_setting}`].filter(Boolean).join(' ') || null],
    ['Dose', b.dose_g !== null ? `${b.dose_g} g` : null],
    [isFilter ? 'Water' : 'Yield', b.yield_g !== null ? `${b.yield_g} g` : null],
    ['Ratio', formatRatio(b.dose_g, b.yield_g)],
    ['Time', b.time_s !== null ? formatDuration(b.time_s) : null],
    ['Water temp', b.water_temp_c !== null ? `${b.water_temp_c} °C` : null],
    ['Milk', b.milk?.name ?? null],
  ]

  const scores: [string, number | null][] = [
    ['Latte art', b.latte_art_rating],
    ['Sweetness', b.sweetness],
    ['Acidity', b.acidity],
    ['Bitterness', b.bitterness],
    ['Body', b.body],
  ]

  function confirmDelete() {
    // The browser's built-in confirm dialog: simple and works everywhere.
    if (!window.confirm('Delete this brew and its photos? This cannot be undone.')) return
    remove.mutate(b.id, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{info.label}</h2>
          <p className="text-sm text-stone-500">{formatDateTime(b.brewed_at)}</p>
        </div>
        <p className="text-right">
          <span className="text-4xl font-bold text-coffee-800">{b.rating_overall}</span>
          <span className="text-stone-500">/10</span>
        </p>
      </div>

      <dl className={`${card} grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm`}>
        {recipe
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-stone-500">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>

      {scores.some(([, v]) => v !== null) && (
        <div className={`${card} flex flex-col gap-2`}>
          {scores
            .filter(([, v]) => v !== null)
            .map(([label, v]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-stone-500">{label}</span>
                {/* A simple bar: width = score × 10% */}
                <span className="h-2 flex-1 rounded-full bg-coffee-100">
                  <span className="block h-2 rounded-full bg-coffee-600" style={{ width: `${v! * 10}%` }} />
                </span>
                <span className="w-6 text-right font-medium">{v}</span>
              </div>
            ))}
        </div>
      )}

      {b.notes && <p className={`${card} whitespace-pre-wrap`}>{b.notes}</p>}

      <PhotoGallery brewId={b.id} photos={b.photos} />

      {remove.error && <p className="text-sm text-red-700">{friendlyError(remove.error)}</p>}

      <div className="flex gap-2">
        <Link to={`/brews/new?from=${b.id}`} className={`${primaryButton} flex-1 text-center`}>Brew again</Link>
        <Link to={`/brews/${b.id}/edit`} className={secondaryButton}>Edit</Link>
      </div>
      <button onClick={confirmDelete} disabled={remove.isPending} className="text-sm text-red-700 underline">
        Delete brew
      </button>
    </section>
  )
}
