import { useState, type ChangeEvent } from 'react'
import { useDeletePhoto, useSignedUrls, useUploadPhotos } from '../hooks/usePhotos'
import { friendlyError } from '../lib/format'
import { thumbPath } from '../lib/photos'
import { secondaryButton, sectionTitle } from '../lib/styles'
import type { BrewPhoto } from '../lib/types'

type Props = {
  brewId: string
  photos: BrewPhoto[]
  readOnly?: boolean // true = only view: no adding or deleting (a friend's brew)
}

export default function PhotoGallery({ brewId, photos, readOnly }: Props) {
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
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>Photos</h2>
        {/* The label is the visible button; clicking it opens the hidden file input. */}
        {!readOnly && (
          <label className={`${secondaryButton} cursor-pointer text-sm ${upload.isPending ? 'pointer-events-none opacity-50' : ''}`}>
            {upload.isPending ? 'Uploading…' : 'Add photos'}
            <input type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
          </label>
        )}
      </div>

      {photos.length === 0 && !upload.isPending && <p className="text-sm text-muted">No photos yet.</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => {
            const url = urls.data?.[thumbPath(photo.storage_path)]
            return (
              <button key={photo.id} onClick={() => setOpen(photo)} aria-label="View photo" className="aspect-square overflow-hidden rounded-lg bg-line">
                {url && <img src={url} alt="" loading="lazy" className="size-full object-cover" />}
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm text-danger">{friendlyError(error)}</p>}

      {/* Full-screen viewer. Always dark, whatever the theme: photos look best on black. */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <img
            src={urls.data?.[open.storage_path]}
            alt=""
            className="min-h-0 flex-1 object-contain p-2 pt-[calc(0.5rem+env(safe-area-inset-top))]"
          />
          {/* stopPropagation: clicks on the buttons shouldn't also count as "click the backdrop" */}
          <div className="flex items-center justify-between p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            {!readOnly && 
            <button onClick={deleteOpen} disabled={remove.isPending} className="min-h-11 text-sm text-red-300 underline underline-offset-2">
              {remove.isPending ? 'Deleting…' : 'Delete photo'}
            </button>
            }
            <button onClick={() => setOpen(null)} className="ml-auto min-h-11 rounded-lg bg-white px-4 font-medium text-black">Close</button>
          </div>
        </div>
      )}
    </section>
  )
}
