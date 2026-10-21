import { Link } from 'react-router-dom'
import { useBrews } from '../hooks/useBrews'
import { useSignedUrls } from '../hooks/usePhotos'
import { thumbPath } from '../lib/photos'
import { drinkInfo } from '../lib/drinkTypes'
import { formatDateTime, formatDuration, formatRatio, friendlyError } from '../lib/format'
import { card, primaryButton } from '../lib/styles'
import type { BrewWithRelations } from '../lib/types'

export default function BrewList() {
  const brews = useBrews()
  // Cover = first photo of each brew. Signed in one batch request.
  const cover = (brew: BrewWithRelations) => (brew.photos[0] ? thumbPath(brew.photos[0].storage_path) : null)
  const coverUrls = useSignedUrls(brews.data?.map(cover).filter((p) => p !== null) ?? [])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My brews</h2>
        <Link to="/brews/new" className={primaryButton}>+ New brew</Link>
      </div>

      {brews.isLoading && <p className="text-stone-500">Loading…</p>}
      {brews.error && <p className="text-red-700">{friendlyError(brews.error)}</p>}
      {brews.data?.length === 0 && <p className="text-stone-500">No brews yet. Pull a shot and log it!</p>}

      <ul className="flex flex-col gap-3">
        {brews.data?.map((brew) => (
          <li key={brew.id}>
            <Link to={`/brews/${brew.id}`} className={`${card} flex items-center gap-3`}>
              <Thumbnail url={coverUrls.data?.[cover(brew) ?? '']} />
              <BrewSummary brew={brew} />
              <ScoreBadge score={brew.rating_overall} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BrewSummary({ brew }: { brew: BrewWithRelations }) {
  const inOut = [brew.dose_g, brew.yield_g]
    .filter((g) => g !== null)
    .map((g) => `${g} g`)
    .join(' → ')
  // e.g. "18 g → 36 g · 1:2.0 · 28 s". Missing values are simply left out.
  const recipe = [inOut, formatRatio(brew.dose_g, brew.yield_g), brew.time_s !== null && formatDuration(brew.time_s)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold">
        {drinkInfo(brew.drink_type).label}
        {brew.bean && <span className="font-normal text-stone-600"> · {brew.bean.name}</span>}
      </p>
      <p className="text-xs text-stone-500">{formatDateTime(brew.brewed_at)}</p>
      {recipe && <p className="text-sm text-stone-600">{recipe}</p>}
    </div>
  )
}

function Thumbnail({ url }: { url?: string }) {
  return (
    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-coffee-100 text-2xl">
      {url ? <img src={url} alt="" loading="lazy" className="size-full object-cover" /> : <span aria-hidden>☕</span>}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-coffee-800 text-lg font-bold text-coffee-50">
      {score}
    </span>
  )
}
