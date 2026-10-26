import { Link, useNavigate, useParams } from 'react-router-dom'
import BrewView from '../components/BrewView'
import { useBrew, useDeleteBrew } from '../hooks/useBrews'
import { friendlyError } from '../lib/format'
import { primaryButton, secondaryButton } from '../lib/styles'

// One of my brews: the shared BrewView, plus the things only the owner can do.
export default function BrewDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const brew = useBrew(id)
  const remove = useDeleteBrew()

  if (brew.isLoading) return <p className="text-muted">Loading brew…</p>
  if (!brew.data) return <p className="text-muted">This brew doesn't exist, or it was deleted.</p>
  const b = brew.data

  function confirmDelete() {
    if (!window.confirm('Delete this brew and its photos? This cannot be undone.')) return
    remove.mutate(b.id, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <article className="flex flex-col gap-6">
      <BrewView brew={b} />

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
