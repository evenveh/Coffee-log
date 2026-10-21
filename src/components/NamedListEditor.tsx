import { useState, type FormEvent } from 'react'
import { useAddNamedItem, useNamedList, useSetNamedItemArchived } from '../hooks/useNamedList'
import { friendlyError } from '../lib/format'
import { card, inputClass, primaryButton } from '../lib/styles'
import type { NamedTable } from '../lib/types'

type Props = {
  table: NamedTable
  title: string
  placeholder: string
}

// Add/archive editor for a simple shared list. Used for both milks and grinders.
export default function NamedListEditor({ table, title, placeholder }: Props) {
  const items = useNamedList(table)
  const add = useAddNamedItem(table)
  const setArchived = useSetNamedItemArchived(table)
  const [name, setName] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    add.mutate(name.trim(), { onSuccess: () => setName('') })
  }

  // Active items first, archived ones after (the list is already sorted by name).
  const sorted = [...(items.data ?? [])].sort((a, b) => Number(a.archived) - Number(b.archived))
  const error = items.error ?? add.error ?? setArchived.error

  return (
    <div className={card}>
      <h3 className="mb-3 font-semibold">{title}</h3>

      {items.isLoading && <p className="text-sm text-stone-500">Loading…</p>}
      {items.data?.length === 0 && <p className="mb-2 text-sm text-stone-500">None yet.</p>}

      <ul className="mb-3 divide-y divide-stone-100">
        {sorted.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-2">
            <span className={item.archived ? 'text-stone-400 line-through' : ''}>{item.name}</span>
            <button
              onClick={() => setArchived.mutate({ id: item.id, archived: !item.archived })}
              disabled={setArchived.isPending}
              className="text-sm text-stone-500 underline"
            >
              {item.archived ? 'Restore' : 'Archive'}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="flex gap-2">
        <input
          aria-label={`New ${title.toLowerCase()}`}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} flex-1`}
        />
        <button disabled={add.isPending} className={primaryButton}>Add</button>
      </form>

      {error && <p className="mt-2 text-sm text-red-700">{friendlyError(error)}</p>}
    </div>
  )
}
