import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BEAN_PHOTO_BUCKET, compress, newPhotoName, thumbPath } from '../lib/photos'
import { supabase } from '../lib/supabase'
import type { Bean, BeanInput } from '../lib/types'

// All beans I can read, including archived ones (pages filter as they need).
// in_my_list is a computed field (a database function), so it has to be asked for by name.
// Newest roast first; beans without a roast date go last.
export function useBeans() {
  return useQuery({
    queryKey: ['beans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beans')
        .select('*, in_my_list')
        .order('roast_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Bean[]
    },
  })
}

// Create (no id) or update (with id) a bean. Returns the bean id, which a new bean
// only has after the insert (the photo upload needs it for its path).
export function useSaveBean() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: BeanInput & { id?: string }) => {
      const { data, error } = id
        ? await supabase.from('beans').update(input).eq('id', id).select('id').single()
        : await supabase.from('beans').insert(input).select('id').single() // created_by and group_id are filled in by the database
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beans'] }),
  })
}

// Replace (file) or remove (null) a bean's photo. Order matters: upload the new
// files, then point the bean at them, and only then delete the old ones, so the
// bean never points at a file that's gone.
export function useSetBeanPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bean, file }: { bean: Pick<Bean, 'id' | 'photo_path'>; file: File | null }) => {
      const bucket = supabase.storage.from(BEAN_PHOTO_BUCKET)
      let path: string | null = null

      if (file) {
        path = `${bean.id}/${newPhotoName()}.jpg` // first folder = bean id (Storage RLS)
        const [full, thumb] = await Promise.all([compress(file, 'full'), compress(file, 'thumb')])
        const up1 = await bucket.upload(path, full, { contentType: 'image/jpeg' })
        if (up1.error) throw up1.error
        const up2 = await bucket.upload(thumbPath(path), thumb, { contentType: 'image/jpeg' })
        if (up2.error) {
          await bucket.remove([path]) // don't leave half a photo behind
          throw up2.error
        }
      }

      const { error } = await supabase.from('beans').update({ photo_path: path }).eq('id', bean.id)
      if (error) {
        if (path) await bucket.remove([path, thumbPath(path)])
        throw error
      }

      // TODO(human): remove the old photo's files (bean.photo_path), if there was one.
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beans'] }),
  })
}

export function useSetBeanArchived() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from('beans').update({ archived }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beans'] }),
  })
}
