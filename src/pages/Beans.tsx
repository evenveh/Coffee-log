import { useState } from 'react'
import { Link } from 'react-router-dom'
import RoastSwatch from '../components/RoastSwatch'
import { useBeans } from '../hooks/useBeans'
import { daysSince, friendlyError } from '../lib/format'
import { listClass, pageTitle, primaryButton } from '../lib/styles'
import type { Bean } from '../lib/types'

export default function Beans() {
  const beans = useBeans()
  const [showArchived, setShowArchived] = useState(false)

  const visible = beans.data?.filter((b) => showArchived || !b.archived) ?? []
  const archivedCount = beans.data?.filter((b) => b.archived).length ?? 0

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className={pageTitle}>Beans</h1>
        <Link to="/beans/new" className={primaryButton}>Add bean</Link>
      </div>
      <p className="-mt-2 text-sm text-muted">Shared with everyone using the app.</p>

      {beans.isLoading && <p className="text-muted">Loading beans…</p>}
      {beans.error && <p className="text-danger">Couldn't load the beans: {friendlyError(beans.error)}</p>}
      {beans.data && visible.length === 0 && (
        <p className="text-muted">No beans yet. Add the bag you're brewing now, and pick it when you log a brew.</p>
      )}

      {visible.length > 0 && (
        <ul className={listClass}>
          {visible.map((bean) => (
            <li key={bean.id}>
              <BeanRow bean={bean} />
            </li>
          ))}
        </ul>
      )}

      {archivedCount > 0 && (
        <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-4 accent-crema" />
          Show finished bags ({archivedCount})
        </label>
      )}
    </section>
  )
}

function BeanRow({ bean }: { bean: Bean }) {
  // "Ethiopia, washed": a plain phrase instead of dot-separated fragments.
  const details = [bean.origin, bean.process?.toLowerCase()].filter(Boolean).join(', ')
  const days = bean.roast_date ? daysSince(bean.roast_date) : null

  return (
    <Link to={`/beans/${bean.id}`} className={`flex items-center gap-3 py-3 ${bean.archived ? 'opacity-60' : ''}`}>
      {/* Like the colour sticker on a roaster's bag. */}
      <RoastSwatch level={bean.roast_level} className="size-12 rounded-lg" />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{bean.name}</p>
        {bean.roaster && <p className="truncate text-sm text-muted">{bean.roaster}</p>}
        {(details || bean.archived) && (
          <p className="truncate text-sm text-muted">
            {details}
            {bean.archived && (details ? ', finished' : 'Finished')}
          </p>
        )}
      </div>

      {/* Freshness is the number a barista checks on a bag. */}
      {days !== null && (
        <p className="flex shrink-0 flex-col items-end">
          <span className="num text-3xl leading-none">{days}</span>
          <span className="text-xs text-muted">days off roast</span>
        </p>
      )}
    </Link>
  )
}
