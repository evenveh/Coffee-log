import imageCompression from 'browser-image-compression'

export const PHOTO_BUCKET = 'brew-photos'

// Each photo is stored twice: full size for viewing, a small thumbnail for lists.
// The thumbnail path is derived from the full path, so the database only stores one.
//   abc/123/1729-x7.jpg  ->  abc/123/1729-x7_thumb.jpg
export function thumbPath(storagePath: string): string {
  return storagePath.replace(/\.jpg$/, '_thumb.jpg')
}

// Shrink a photo in the browser before upload. JPEG works on every phone browser.
export function compress(file: File, size: 'full' | 'thumb'): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: size === 'full' ? 1600 : 400,
    maxSizeMB: size === 'full' ? 0.4 : 0.05,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
    useWebWorker: true, // compress in a background thread so the page doesn't freeze
  })
}

// A unique-enough file name: timestamp + random letters.
export function newPhotoName(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
