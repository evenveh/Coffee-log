import { useEffect, useState, type ChangeEvent } from 'react'
import { secondaryButton } from '../lib/styles'

type Props = {
  files: File[]
  onChange: (files: File[]) => void
}

// Pick photos and preview them before they're uploaded. Controlled: the parent owns `files`.
export default function PendingPhotos({ files, onChange }: Props) {
  function onPick(e: ChangeEvent<HTMLInputElement>) {
    onChange([...files, ...Array.from(e.target.files ?? [])])
    e.target.value = '' // reset, so picking the same file again still fires onChange
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Photos</h3>
        <label className={`${secondaryButton} cursor-pointer text-sm`}>
          + Add photos
          <input type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
        </label>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, i) => (
            <Preview key={`${file.name}-${file.lastModified}-${i}`} file={file} onRemove={() => onChange(files.filter((f) => f !== file))} />
          ))}
        </div>
      )}
      {files.length > 0 && <p className="text-xs text-stone-500">Uploaded when you save.</p>}
    </div>
  )
}

function Preview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string>()

  // Create a temporary local address for the file, and release it again when the
  // preview goes away (the cleanup function), so the browser can free the memory.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    // Intentional: the object URL is an external browser resource that must be created and
    // released together. Creating it during render (useMemo) breaks under StrictMode, which
    // runs the cleanup and re-runs effects in development.
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-coffee-100">
      {url && <img src={url} alt="" className="size-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
      >
        ×
      </button>
    </div>
  )
}
