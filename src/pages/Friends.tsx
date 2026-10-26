import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import RoastSwatch from '../components/RoastSwatch'
import Score from '../components/Score'
import { useCreateGroup, useFriendBrews, useGroupMembers, useJoinGroup, useMyGroup } from '../hooks/useFriends'
import { useSignedUrls } from '../hooks/usePhotos'
import { drinkInfo } from '../lib/drinkTypes'
import { formatDayHeading, formatDuration, formatRatio, formatTime, friendlyError, groupByDay } from '../lib/format'
import { thumbPath } from '../lib/photos'
import { inputClass, labelClass, listClass, pageTitle, primaryButton, secondaryButton, sectionTitle } from '../lib/styles'
import type { BrewWithRelations, Group } from '../lib/types'

export default function Friends() {
  const group = useMyGroup()

  return (
    <section className="flex flex-col gap-4">
      <h1 className={pageTitle}>Friends</h1>

      {group.isLoading && <p className="text-muted">Loading…</p>}
      {group.error && <p className="text-danger">Couldn't load your group: {friendlyError(group.error)}</p>}
      {group.data === null && <NoGroup />}
      {group.data && <Feed group={group.data} />}
    </section>
  )
}

// Not in a group yet: start one, or join a friend's with their code.
function NoGroup() {
  const create = useCreateGroup()
  const join = useJoinGroup()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  function submitCreate(e: FormEvent) {
    e.preventDefault()
    create.mutate(name.trim())
  }

  function submitJoin(e: FormEvent) {
    e.preventDefault()
    join.mutate(code.trim())
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-2 text-sm text-muted">
        In a group, you see each other's brews and photos here. Your own log stays separate.
      </p>

      <form onSubmit={submitJoin} className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Join a group</h2>
        <div>
          <label className={labelClass} htmlFor="invite_code">Invite code</label>
          <div className="flex gap-2">
            <input
              id="invite_code"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="a1b2c3d4"
              className={`${inputClass} num flex-1`}
            />
            <button disabled={join.isPending} className={primaryButton}>{join.isPending ? 'Joining…' : 'Join group'}</button>
          </div>
        </div>
        {join.error && <p role="alert" className="text-sm text-danger">{friendlyError(join.error)}</p>}
      </form>

      <form onSubmit={submitCreate} className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className={sectionTitle}>Start a group</h2>
        <div>
          <label className={labelClass} htmlFor="group_name">Group name</label>
          <div className="flex gap-2">
            <input id="group_name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Saturday espresso club" className={`${inputClass} flex-1`} />
            <button disabled={create.isPending} className={secondaryButton}>{create.isPending ? 'Creating…' : 'Create group'}</button>
          </div>
        </div>
        <p className="text-sm text-muted">You'll get an invite code to share in Settings.</p>
        {create.error && <p role="alert" className="text-sm text-danger">{friendlyError(create.error)}</p>}
      </form>
    </div>
  )
}

function Feed({ group }: { group: Group }) {
  const brews = useFriendBrews()
  const members = useGroupMembers(group.id)
  const nameOf = (userId: string) => members.data?.find((m) => m.id === userId)?.display_name || 'A friend'
  // Cover = first photo of each brew. Signed in one batch request, as in My brews.
  const cover = (brew: BrewWithRelations) => (brew.photos[0] ? thumbPath(brew.photos[0].storage_path) : null)
  const coverUrls = useSignedUrls(brews.data?.map(cover).filter((p) => p !== null) ?? [])

  return (
    <>
      <p className="-mt-2 text-sm text-muted">Brews from {group.name}.</p>

      {brews.isLoading && <p className="text-muted">Loading brews…</p>}
      {brews.error && <p className="text-danger">Couldn't load your group's brews: {friendlyError(brews.error)}</p>}
      {brews.data?.length === 0 && (
        <p className="text-muted">
          No brews from your group yet. Share your invite code from <Link to="/settings" className="text-ink underline">Settings</Link>.
        </p>
      )}

      {groupByDay(brews.data ?? []).map((day) => (
        <section key={day.day} aria-label={formatDayHeading(day.day)}>
          <h2 className="mt-2 mb-1 text-sm font-semibold text-muted">{formatDayHeading(day.day)}</h2>
          <ul className={listClass}>
            {day.items.map((brew) => (
              <li key={brew.id}>
                <FriendBrewRow brew={brew} name={nameOf(brew.user_id)} thumbUrl={coverUrls.data?.[cover(brew) ?? '']} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

// Like a row in My brews, with the friend's name on top and their notes underneath.
// Opens the brew's read-only page (FriendBrew).
function FriendBrewRow({ brew, name, thumbUrl }: { brew: BrewWithRelations; name: string; thumbUrl?: string }) {
  const ratio = formatRatio(brew.dose_g, brew.yield_g)
  const inOut = [brew.dose_g, brew.yield_g].filter((g) => g !== null).join(' → ')
  const drink = drinkInfo(brew.drink_type).label
  const what = brew.bean ? `${drink} with ${brew.bean.name}` : drink

  return (
    <Link to={`/friends/${brew.id}`} className="flex items-stretch gap-3 py-3">
      <RoastSwatch level={brew.bean?.roast_level} className="w-1.5 rounded-full" />

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="truncate font-semibold">{name}</span>
          <span className="text-sm text-muted">{formatTime(brew.brewed_at)}</span>
        </p>
        <p className="truncate text-sm text-muted">{what}</p>

        {(inOut || brew.time_s !== null) && (
          <p className="mt-1 flex items-baseline gap-3">
            {inOut && <span className="num text-2xl leading-none">{inOut}</span>}
            {brew.time_s !== null && <span className="num text-lg leading-none text-muted">{formatDuration(brew.time_s)}</span>}
            {ratio && <span className="num text-lg leading-none text-crema-ink">{ratio}</span>}
          </p>
        )}

        {brew.notes && <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap text-muted">{brew.notes}</p>}
      </div>

      {thumbUrl && <img src={thumbUrl} alt="" loading="lazy" className="size-14 shrink-0 self-center rounded-lg object-cover" />}

      <Score value={brew.rating_overall} />
    </Link>
  )
}
