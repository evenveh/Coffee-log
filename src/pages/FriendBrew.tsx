import { Link, useParams } from 'react-router-dom'
import BrewView from '../components/BrewView'
import { useFriendBrew, useGroupMembers, useMyGroup } from '../hooks/useFriends'
import { primaryButton } from '../lib/styles'

// A brew from someone in my group: the same view as my own brews, but read-only.
export default function FriendBrew() {
  const { id } = useParams()
  const brew = useFriendBrew(id)
  const group = useMyGroup()
  const members = useGroupMembers(group.data?.id)

  if (brew.isLoading) return <p className="text-muted">Loading brew…</p>
  if (!brew.data) return <p className="text-muted">This brew doesn't exist, or it isn't shared with you.</p>
  const b = brew.data

  const name = members.data?.find((m) => m.id === b.user_id)?.display_name || 'A friend'

  return (
    <article className="flex flex-col gap-6">
      <BrewView brew={b} by={name} readOnly />

      {/* Copies the recipe (not the scores) into a new brew of my own. */}
      <Link to={`/brews/new?from=${b.id}`} className={primaryButton}>Brew again</Link>
    </article>
  )
}
