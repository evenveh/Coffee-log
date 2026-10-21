import { useState, type ChangeEvent } from 'react'
import { useDeletePhoto, useSignedUrls, useUploadPhotos } from '../hooks/usePhotos'
import { friendlyError } from '../lib/format'
import { thumbPath } from '../lib/photos'
import { card, secondaryButton } from '../lib/styles'
import type { BrewPhoto } from '../lib/types'

type Props = {
  brewId: string
  photos: BrewPhoto[]
}

export default function PhotoGallery({ brewId, photos }: Props) {
  const upload = useUploadPhotos()
  const remove = useDeletePhoto()
  const urls = useSignedUrls(photos.flatMap((p) => [thumbPath(p.storage_path), p.storage_path]))
  const [open, setOpen] = useState<BrewPhoto | null>(null) // photo shown full-screen, or null

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) upload.mutate({ brewId, files })
    e.target.value = '' // reset, so picking the same file again still fires onChange
  }

  function deleteOpen() {
    if (!open || !window.confirm('Delete this photo?')) return
    remove.mutate(open, { onSuccess: () => setOpen(null) })
  }

  const error = upload.error ?? remove.error ?? urls.error

  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Photos</h3>
        {/* The label is the visible button; clicking it opens the hidden file input. */}
        <label className={`${secondaryButton} cursor-pointer text-sm ${upload.isPending ? 'pointer-events-none opacity-50' : ''}`}>
          {upload.isPending ? 'Uploading…' : '+ Add photos'}
          <input type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
        </label>
      </div>

      {photos.length === 0 && !upload.isPending && <p className="text-sm text-stone-500">No photos yet.</p>}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => {
          const url = urls.data?.[thumbPath(photo.storage_path)]
          return (
            <button key={photo.id} onClick={() => setOpen(photo)} className="aspect-square overflow-hidden rounded-lg bg-coffee-100">
              {url && <img src={url} alt="" loading="lazy" className="size-full object-cover" />}
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-700">{friendlyError(error)}</p>}

      {/* Full-screen viewer */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setOpen(null)}>
          <img
            src={urls.data?.[open.storage_path]}
            alt=""
            className="min-h-0 flex-1 object-contain p-2"
          />
          {/* stopPropagation: clicks on the buttons shouldn't also count as "click the backdrop" */}
          <div className="flex justify-between p-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={deleteOpen} disabled={remove.isPending} className="text-sm text-red-300 underline">
              {remove.isPending ? 'Deleting…' : 'Delete photo'}
            </button>
            <button onClick={() => setOpen(null)} className="rounded-lg bg-white px-4 py-2 font-medium">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
