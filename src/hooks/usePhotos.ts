import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { compress, newPhotoName, PHOTO_BUCKET, thumbPath } from '../lib/photos'
import { supabase } from '../lib/supabase'
import type { BrewPhoto } from '../lib/types'
import { useUser } from './useAuth'

const URL_LIFETIME_S = 60 * 60 // signed URLs work for 1 hour

// Temporary links for private files, as { path: url }. One request for many files.
export function useSignedUrls(paths: string[], bucket = PHOTO_BUCKET) {
  return useQuery({
    // The bucket is part of the key: the same path in another bucket is another file.
    queryKey: ['signed-urls', bucket, paths],
    enabled: paths.length > 0,
    // Reuse cached links for 50 min, then fetch fresh ones before the old ones expire.
    staleTime: (URL_LIFETIME_S - 10 * 60) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, URL_LIFETIME_S)
      if (error) throw error
      const urls: Record<string, string> = {}
      for (const item of data) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
      return urls
    },
  })
}

// Compress + upload one or more photos for a brew. The brew id is passed per call,
// because on the New brew screen it only exists after the brew has been saved.
export function useUploadPhotos() {
  const user = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ brewId, files }: { brewId: string; files: File[] }) => {
      // One at a time: simpler, and kinder to a phone's memory than compressing all at once.
      for (const file of files) {
        const path = `${user.id}/${brewId}/${newPhotoName()}.jpg` // first folder = user id (Storage RLS)
        const [full, thumb] = await Promise.all([compress(file, 'full'), compress(file, 'thumb')])

        const bucket = supabase.storage.from(PHOTO_BUCKET)
        const up1 = await bucket.upload(path, full, { contentType: 'image/jpeg' })
        if (up1.error) throw up1.error
        const up2 = await bucket.upload(thumbPath(path), thumb, { contentType: 'image/jpeg' })
        if (up2.error) {
          await bucket.remove([path]) // don't leave half a photo behind
          throw up2.error
        }

        const { error } = await supabase.from('brew_photos').insert({ brew_id: brewId, storage_path: path })
        if (error) {
          await bucket.remove([path, thumbPath(path)])
          throw error
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brews'] }),
  })
}

export function useDeletePhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (photo: BrewPhoto) => {
      const { error: storageError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([photo.storage_path, thumbPath(photo.storage_path)])
      if (storageError) throw storageError
      const { error } = await supabase.from('brew_photos').delete().eq('id', photo.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brews'] }),
  })
}
