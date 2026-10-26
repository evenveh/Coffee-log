import { useParams } from 'react-router-dom'
import { useFriendBrew } from '../hooks/useFriends'
import { drinkInfo } from '../lib/drinkTypes'
import PhotoGallery from '../components/PhotoGallery'

export default function FriendBrew() {
  const { id } = useParams()
  const brew = useFriendBrew(id)

  if (brew.isLoading) return <p className="text-muted">Loading brew...</p>
  if (!brew.data) return <p className="text-muted">This brew doesn't exist, or it isn't shared with you.</p>

  const b = brew.data

  return (
    <article className="flex flex-col gap-2">
      <h1 className="text-2xl">{drinkInfo(b.drink_type).label}</h1>
      <p>Score: <span className="num">{b.rating_overall}</span>/10</p>
      <PhotoGallery brewId={b.id} photos={b.photos} readOnly />
    </article>
  )

}
