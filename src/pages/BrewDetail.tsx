import { Link, useNavigate, useParams } from 'react-router-dom'
import PhotoGallery from '../components/PhotoGallery'
import RoastSwatch from '../components/RoastSwatch'
import { useBrew, useDeleteBrew } from '../hooks/useBrews'
import { useSignedUrls } from '../hooks/usePhotos'
import { drinkInfo } from '../lib/drinkTypes'
import { daysSince, formatDateTime, formatDuration, formatRatio, friendlyError } from '../lib/format'
import { primaryButton, secondaryButton, sectionTitle } from '../lib/styles'

export default function BrewDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const brew = useBrew(id)
  const remove = useDeleteBrew()
  const coverPath = brew.data?.photos[0]?.storage_path
  const cover = useSignedUrls(coverPath ? [coverPath] : [])

  if (brew.isLoading) return <p className="text-muted">Loading brew…</p>
  if (!brew.data) return <p className="text-muted">This brew doesn't exist, or it was deleted.</p>
  const b = brew.data

  const info = drinkInfo(b.drink_type)
  const isFilter = info.category === 'filter'
  const ratio = formatRatio(b.dose_g, b.yield_g)
  const coverUrl = coverPath ? cover.data?.[coverPath] : undefined

  // Smaller numbers under the recipe; only the ones that were logged.
  const facts: [string, string][] = []
  if (b.time_s !== null) facts.push(['time', formatDuration(b.time_s)])
  if (ratio) facts.push(['ratio', ratio])
  if (b.water_temp_c !== null) facts.push(['°C', String(b.water_temp_c)])

  const equipment = [
    b.grinder && (b.grind_setting !== null ? `${b.grinder.name} at ${b.grind_setting}` : b.grinder.name),
    !b.grinder && b.grind_setting !== null && `Grind ${b.grind_setting}`,
    b.milk && `${b.milk.name} milk`,
  ].filter(Boolean) as string[]

  const scores: [string, number | null][] = [
    ['Latte art', b.latte_art_rating],
    ['Sweetness', b.sweetness],
    ['Acidity', b.acidity],
    ['Bitterness', b.bitterness],
    ['Body', b.body],
  ]
  const shownScores = scores.filter(([, v]) => v !== null) as [string, number][]

  function confirmDelete() {
    if (!window.confirm('Delete this brew and its photos? This cannot be undone.')) return
    remove.mutate(b.id, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <article className="flex flex-col gap-6">
      {/* Photo hero: -mx-4 cancels the page padding so the photo reaches the screen edges. */}
      {coverPath && (
        <div className="-mx-4 -mt-2 aspect-[4/3] bg-line">
          {coverUrl && <img src={coverUrl} alt={`${info.label} photo`} className="size-full object-cover" />}
        </div>
      )}

      <header>
        <h1 className="text-2xl">{info.label}</h1>
        <p className="text-sm text-muted">{formatDateTime(b.brewed_at)}</p>
      </header>

      {/* Recipe hero + score: the signature numerals, large. */}
      <div className="flex items-end justify-between gap-4">
        {b.dose_g !== null || b.yield_g !== null ? (
          <div className="flex items-end gap-3">
            <Big value={b.dose_g} label="g in" />
            <span className="num pb-6 text-3xl text-muted" aria-hidden>→</span>
            <Big value={b.yield_g} label={isFilter ? 'g water' : 'g out'} />
          </div>
        ) : (
          <span />
        )}
        <div className="text-right">
          <p className="num text-6xl leading-none">
            {b.rating_overall}
            <span className="text-2xl text-muted">/10</span>
          </p>
          <span className="mt-2 block h-1.5 w-full rounded-full bg-line">
            <span className="block h-1.5 rounded-full bg-crema" style={{ width: `${b.rating_overall * 10}%` }} />
          </span>
        </div>
      </div>

      {(facts.length > 0 || equipment.length > 0) && (
        <div className="flex flex-col gap-2">
          {facts.length > 0 && (
            <dl className="flex gap-6">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className={`num text-2xl leading-tight ${label === 'ratio' ? 'text-crema-ink' : ''}`}>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {equipment.length > 0 && <p className="text-sm text-muted">{equipment.join(', ')}</p>}
        </div>
      )}

      {b.bean && (
        <Link to={`/beans/${b.bean.id}`} className="flex items-center gap-3 border-y border-line py-3">
          <RoastSwatch level={b.bean.roast_level} className="size-10 rounded-md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{b.bean.name}</span>
            <span className="block text-sm text-muted">
              {b.bean.roaster}
              {b.bean.roaster && b.bean.roast_date && ', '}
              {b.bean.roast_date && (
                <span className="text-crema-ink">{daysSince(b.bean.roast_date, new Date(b.brewed_at))} days off roast</span>
              )}
            </span>
          </span>
        </Link>
      )}

      {shownScores.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={sectionTitle}>Taste</h2>
          {shownScores.map(([label, v]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 text-sm text-muted">{label}</span>
              <span className="h-1.5 flex-1 rounded-full bg-line">
                <span className="block h-1.5 rounded-full bg-crema" style={{ width: `${v * 10}%` }} />
              </span>
              <span className="num w-6 text-right text-lg">{v}</span>
            </div>
          ))}
        </section>
      )}

      {b.notes && (
        <section>
          <h2 className={`${sectionTitle} mb-1`}>Notes</h2>
          <p className="max-w-prose whitespace-pre-wrap">{b.notes}</p>
        </section>
      )}

      <PhotoGallery brewId={b.id} photos={b.photos} />

      {remove.error && <p className="text-sm text-danger">Couldn't delete the brew: {friendlyError(remove.error)}</p>}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Link to={`/brews/new?from=${b.id}`} className={`${primaryButton} flex-1`}>Brew again</Link>
          <Link to={`/brews/${b.id}/edit`} className={secondaryButton}>Edit</Link>
        </div>
        <button onClick={confirmDelete} disabled={remove.isPending} className="min-h-11 self-center text-sm text-danger underline underline-offset-2">
          {remove.isPending ? 'Deleting…' : 'Delete brew'}
        </button>
      </div>
    </article>
  )
}

// One big recipe number with a small label underneath ("18" / "g in").
function Big({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="num text-6xl leading-none">{value ?? '–'}</span>
      <span className="mt-1 text-xs text-muted">{label}</span>
    </div>
  )
}
