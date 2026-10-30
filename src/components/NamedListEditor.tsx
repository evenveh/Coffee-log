import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAddNamedItem, useNamedList, useSetNamedItemArchived } from '../hooks/useNamedList'
import { friendlyError } from '../lib/format'
import { inputClass, listClass, secondaryButton, sectionTitle } from '../lib/styles'
import type { NamedTable } from '../lib/types'

type Props = {
  table: NamedTable
  title: string
  placeholder: string
  linkTo?: (id: string) => string // makes each name a link, e.g. to the grinder's page
}

// Add/archive editor for one of my group's simple lists. Used for milks, grinders and brewers.
export default function NamedListEditor({ table, title, placeholder, linkTo }: Props) {
  const items = useNamedList(table)
  const add = useAddNamedItem(table)
  const setArchived = useSetNamedItemArchived(table)
  const [name, setName] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    add.mutate(name.trim(), { onSuccess: () => setName('') })
  }

  // Only my list (not rows I can read just because a brew uses them).
  // Active items first, archived ones after (the list is already sorted by name).
  const sorted = (items.data ?? []).filter((i) => i.in_my_list).sort((a, b) => Number(a.archived) - Number(b.archived))
  const error = items.error ?? add.error ?? setArchived.error

  return (
    <section className="flex flex-col gap-3">
      <h2 className={sectionTitle}>{title}</h2>

      {items.isLoading && <p className="text-sm text-muted">Loading…</p>}
      {items.data && sorted.length === 0 && <p className="text-sm text-muted">The list is empty.</p>}

      {sorted.length > 0 && (
        <ul className={listClass}>
          {sorted.map((item) => (
            <li key={item.id} className="flex min-h-11 items-center justify-between gap-3 py-1">
              {linkTo ? (
                <Link to={linkTo(item.id)} className={`flex min-h-11 flex-1 items-center ${item.archived ? 'text-muted line-through' : ''}`}>{item.name}</Link>
              ) : (
                <span className={item.archived ? 'text-muted line-through' : ''}>{item.name}</span>
              )}
              <button
                onClick={() => setArchived.mutate({ id: item.id, archived: !item.archived })}
                disabled={setArchived.isPending}
                className="min-h-11 px-1 text-sm text-muted underline underline-offset-2"
              >
                {item.archived ? 'Restore' : 'Archive'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <input
          aria-label={`New ${title.toLowerCase()} name`}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} flex-1`}
        />
        <button disabled={add.isPending} className={secondaryButton}>Add</button>
      </form>

      {error && <p className="text-sm text-danger">{friendlyError(error)}</p>}
    </section>
  )
}
