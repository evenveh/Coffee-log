import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBeans } from '../hooks/useBeans'
import { daysSince, friendlyError } from '../lib/format'
import { card, primaryButton } from '../lib/styles'
import type { Bean } from '../lib/types'

export default function Beans() {
  const beans = useBeans()
  const [showArchived, setShowArchived] = useState(false)

  const visible = beans.data?.filter((b) => showArchived || !b.archived) ?? []

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Beans</h2>
        <Link to="/beans/new" className={primaryButton}>+ Add bean</Link>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>

      {beans.isLoading && <p className="text-stone-500">Loading…</p>}
      {beans.error && <p className="text-red-700">{friendlyError(beans.error)}</p>}
      {beans.data && visible.length === 0 && (
        <p className="text-stone-500">No beans yet. Add the bag you're currently brewing.</p>
      )}

      <ul className="flex flex-col gap-3">
        {visible.map((bean) => (
          <li key={bean.id}>
            <Link to={`/beans/${bean.id}`} className={`${card} block ${bean.archived ? 'opacity-50' : ''}`}>
              <BeanSummary bean={bean} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BeanSummary({ bean }: { bean: Bean }) {
  // Only show the details that are filled in, joined with dots.
  const details = [bean.origin, bean.process, bean.roast_level].filter(Boolean).join(' · ')

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          {bean.roaster && <p className="text-xs uppercase tracking-wide text-stone-500">{bean.roaster}</p>}
          <p className="font-semibold">{bean.name}</p>
        </div>
        {bean.archived && <span className="rounded bg-stone-200 px-2 py-0.5 text-xs">Archived</span>}
      </div>
      {details && <p className="text-sm text-stone-600">{details}</p>}
      {bean.roast_date && (
        <p className="mt-1 text-sm text-coffee-600">
          Roasted {bean.roast_date} · {daysSince(bean.roast_date)} days off roast
        </p>
      )}
    </>
  )
}
