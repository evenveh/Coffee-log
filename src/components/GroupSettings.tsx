import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGroupMembers, useLeaveGroup, useMyGroup } from '../hooks/useFriends'
import { useUser } from '../hooks/useAuth'
import { friendlyError } from '../lib/format'
import { listClass, secondaryButton, sectionTitle, textButton } from '../lib/styles'

// Your group: its invite code, who's in it, and leaving it.
export default function GroupSettings() {
  const user = useUser()
  const group = useMyGroup()
  const members = useGroupMembers(group.data?.id)
  const leave = useLeaveGroup()
  const [copied, setCopied] = useState(false)

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(true)
  }

  function confirmLeave() {
    if (!window.confirm("Leave this group? You'll stop seeing each other's brews, and the beans and lists stay with the group.")) return
    leave.mutate()
  }

  const error = group.error ?? members.error ?? leave.error

  return (
    <section className="flex flex-col gap-3">
      <h2 className={sectionTitle}>Group</h2>

      {group.isLoading && <p className="text-sm text-muted">Loading…</p>}
      {group.data === null && (
        <p className="text-sm text-muted">
          You're not in a group. Start or join one on the <Link to="/friends" className="text-ink underline">Friends</Link> tab.
        </p>
      )}

      {group.data && (
        <>
          <p className="text-sm text-muted">
            You're in <strong className="text-ink">{group.data.name}</strong>. Members see each other's brews and photos, but can't change them.
          </p>

          <div className="flex items-end justify-between gap-3">
            <p className="flex flex-col">
              <span className="text-sm text-muted">Invite code</span>
              <span className="num text-3xl leading-none select-all">{group.data.invite_code}</span>
            </p>
            <button type="button" onClick={() => copyCode(group.data!.invite_code)} className={secondaryButton}>
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>

          {members.data && (
            <ul className={listClass}>
              {members.data.map((m) => (
                <li key={m.id} className="flex min-h-11 items-center py-1">
                  {m.display_name || 'No name yet'}
                  {m.id === user.id && <span className="ml-1 text-muted">(you)</span>}
                </li>
              ))}
            </ul>
          )}

          <button type="button" onClick={confirmLeave} disabled={leave.isPending} className={`${textButton} self-start`}>
            {leave.isPending ? 'Leaving…' : 'Leave group'}
          </button>
        </>
      )}

      {error && <p className="text-sm text-danger">{friendlyError(error)}</p>}
    </section>
  )
}
