import { Link } from 'react-router-dom'
import RoastSwatch from '../components/RoastSwatch'
import Score from '../components/Score'
import { useBrews } from '../hooks/useBrews'
import { useSignedUrls } from '../hooks/usePhotos'
import { drinkInfo } from '../lib/drinkTypes'
import { formatDayHeading, formatDuration, formatRatio, formatTime, friendlyError, groupByDay } from '../lib/format'
import { thumbPath } from '../lib/photos'
import { listClass, pageTitle } from '../lib/styles'
import type { BrewWithRelations } from '../lib/types'

export default function BrewList() {
  const brews = useBrews()
  // Cover = first photo of each brew. Signed in one batch request.
  const cover = (brew: BrewWithRelations) => (brew.photos[0] ? thumbPath(brew.photos[0].storage_path) : null)
  const coverUrls = useSignedUrls(brews.data?.map(cover).filter((p) => p !== null) ?? [])

  return (
    <section>
      <h1 className={pageTitle}>My brews</h1>

      {brews.isLoading && <p className="mt-4 text-muted">Loading brews…</p>}
      {brews.error && <p className="mt-4 text-danger">Couldn't load your brews: {friendlyError(brews.error)}</p>}
      {brews.data?.length === 0 && (
        <p className="mt-4 text-muted">No brews yet. Tap <strong className="text-ink">Log brew</strong> after your next shot.</p>
      )}

      {groupByDay(brews.data ?? []).map((group) => (
        <section key={group.day} aria-label={formatDayHeading(group.day)}>
          <h2 className="mt-6 mb-1 text-sm font-semibold text-muted">{formatDayHeading(group.day)}</h2>
          <ul className={listClass}>
            {group.items.map((brew) => (
              <li key={brew.id}>
                <BrewRow brew={brew} thumbUrl={coverUrls.data?.[cover(brew) ?? '']} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  )
}

function BrewRow({ brew, thumbUrl }: { brew: BrewWithRelations; thumbUrl?: string }) {
  const ratio = formatRatio(brew.dose_g, brew.yield_g)
  // "18 → 36" when both are known, otherwise whichever one we have.
  const inOut = [brew.dose_g, brew.yield_g].filter((g) => g !== null).join(' → ')

  return (
    <Link to={`/brews/${brew.id}`} className="flex items-stretch gap-3 py-3">
      {/* Roast-colour edge: which bag this brew used, at a glance. */}
      <RoastSwatch level={brew.bean?.roast_level} className="w-1.5 rounded-full" />

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="font-semibold">{drinkInfo(brew.drink_type).label}</span>
          <span className="text-sm text-muted">{formatTime(brew.brewed_at)}</span>
        </p>
        {brew.bean && <p className="truncate text-sm text-muted">{brew.bean.name}</p>}

        {/* The recipe: the one bold element of the row. */}
        {(inOut || brew.time_s !== null) && (
          <p className="mt-1 flex items-baseline gap-3">
            {inOut && <span className="num text-2xl leading-none">{inOut}</span>}
            {brew.time_s !== null && <span className="num text-lg leading-none text-muted">{formatDuration(brew.time_s)}</span>}
            {ratio && <span className="num text-lg leading-none text-crema-ink">{ratio}</span>}
          </p>
        )}
      </div>

      {thumbUrl && <img src={thumbUrl} alt="" loading="lazy" className="size-14 shrink-0 self-center rounded-lg object-cover" />}

      {/* A nudge to come back after tasting. Only here: friends' brews aren't mine to rate. */}
      <Score value={brew.rating_overall} unratedLabel="Rate" />
    </Link>
  )
}
