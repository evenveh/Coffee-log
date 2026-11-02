import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PHOTO_BUCKET, thumbPath } from '../lib/photos'
import { supabase } from '../lib/supabase'
import type { BrewInput, BrewWithRelations } from '../lib/types'
import { useUser } from './useAuth'

// "*" = all brew columns. "bean:beans(...)" = follow bean_id into the beans table and
// include those columns as brew.bean. Same for milk, grinder and brewer. One request, no extra lookups.
export const BREW_SELECT =
  '*, bean:beans(id, name, roaster, roast_date, roast_level), milk:milks(name), grinder:grinders(name), brewer:brewers(name), photos:brew_photos(id, storage_path, created_at)'

// Oldest photo first, so the first one you added is the "cover" shown in the list.
export function sortPhotos(brew: BrewWithRelations) {
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

// Brews for the dial-in maths (lib/dialIn.ts): mine and my group's, newest first. No user filter,
// on purpose: RLS returns my own brews plus my group's, and a group is a household sharing its
// grinders, so their shots on the same bean and grinder tell me about my setup too (separate
// physical grinders need separate grinder rows). Not under ['brews'], so it never mixes into my
// own log, Log brew's defaults or anything else that's only about me.
export function useDialInBrews() {
  return useQuery({
    queryKey: ['dial-in-brews'],
    queryFn: async () => {
      const { data, error } = await supabase.from('brews').select(BREW_SELECT).order('brewed_at', { ascending: false })
      if (error) throw error
      return data as BrewWithRelations[]
    },
  })
}

// One of my brews. Cached as ['brews', id], so invalidating ['brews'] refreshes this too.
// Also filtered by user, so a friend's brew id shows "doesn't exist" instead of an edit form.
export function useBrew(id: string | undefined) {
  const user = useUser()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['brews', id],
    enabled: !!id, // don't run until we have an id
    // Coming from the list, we already have this brew: show it right away while the
    // real fetch runs. Placeholder data isn't saved in the cache; the fetch result replaces it.
    placeholderData: () => queryClient.getQueryData<BrewWithRelations[]>(['brews'])?.find((b) => b.id === id),
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
    onSuccess: () => invalidateBrews(queryClient),
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
    onSuccess: () => invalidateBrews(queryClient),
  })
}

// Saving or deleting a brew changes my own log and the dial-in data (useDialInBrews).
function invalidateBrews(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([queryClient.invalidateQueries({ queryKey: ['brews'] }), queryClient.invalidateQueries({ queryKey: ['dial-in-brews'] })])
}
