import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PHOTO_BUCKET, thumbPath } from '../lib/photos'
import { supabase } from '../lib/supabase'
import type { BrewInput, BrewWithRelations } from '../lib/types'
import { useUser } from './useAuth'

// "*" = all brew columns. "bean:beans(...)" = follow bean_id into the beans table and
// include those columns as brew.bean. Same for milk and grinder. One request, no extra lookups.
export const BREW_SELECT =
  '*, bean:beans(id, name, roaster, roast_date, roast_level), milk:milks(name), grinder:grinders(name), photos:brew_photos(id, storage_path, created_at)'

// Oldest photo first, so the first one you added is the "cover" shown in the list.
function sortPhotos(brew: BrewWithRelations) {
  brew.photos.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return brew
}

// My brews, newest first. The user filter matters: RLS also lets you read your
// group's brews, and those must not mix into your own log.
export function useBrews() {
  const user = useUser()
  return useQuery({
    queryKey: ['brews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brews')
        .select(BREW_SELECT)
        .eq('user_id', user.id)
        .order('brewed_at', { ascending: false })
      if (error) throw error
      return (data as BrewWithRelations[]).map(sortPhotos)
    },
  })
}

// One of my brews. Cached as ['brews', id], so invalidating ['brews'] refreshes this too.
// Also filtered by user, so a friend's brew id shows "doesn't exist" instead of an edit form.
export function useBrew(id: string | undefined) {
  const user = useUser()
  return useQuery({
    queryKey: ['brews', id],
    enabled: !!id, // don't run until we have an id
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brews')
        .select(BREW_SELECT)
        .eq('id', id!)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data ? sortPhotos(data as BrewWithRelations) : null // null = not found (or not yours)
    },
  })
}

// Create (no id) or update (with id). Returns the brew's id so we can navigate to it.
export function useSaveBrew() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: BrewInput & { id?: string }) => {
      const query = id
        ? supabase.from('brews').update(input).eq('id', id)
        : supabase.from('brews').insert(input) // user_id is filled in by the database
      const { data, error } = await query.select('id').single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brews'] }),
  })
}

export function useDeleteBrew() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Remove the photo files. The database cascade only deletes the brew_photos rows,
      //    so without this the files would stay in Storage forever, using up space.
      const { data: photos, error: listError } = await supabase.from('brew_photos').select('storage_path').eq('brew_id', id)
      if (listError) throw listError
      const paths = photos.flatMap((p) => [p.storage_path, thumbPath(p.storage_path)])
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove(paths)
        if (storageError) throw storageError
      }
      // 2. Delete the brew (its brew_photos rows go with it).
      const { error } = await supabase.from('brews').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brews'] }),
  })
}
