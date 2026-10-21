import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { BrewInput, BrewWithRelations } from '../lib/types'

// "*" = all brew columns. "bean:beans(...)" = follow bean_id into the beans table and
// include those columns as brew.bean. Same for milk and grinder. One request, no extra lookups.
const BREW_SELECT = '*, bean:beans(id, name, roaster, roast_date), milk:milks(name), grinder:grinders(name)'

// My brews, newest first. No user filter needed: RLS only ever returns your own rows.
export function useBrews() {
  return useQuery({
    queryKey: ['brews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brews')
        .select(BREW_SELECT)
        .order('brewed_at', { ascending: false })
      if (error) throw error
      return data as BrewWithRelations[]
    },
  })
}

// One brew. Cached as ['brews', id], so invalidating ['brews'] refreshes this too.
export function useBrew(id: string | undefined) {
  return useQuery({
    queryKey: ['brews', id],
    enabled: !!id, // don't run until we have an id
    queryFn: async () => {
      const { data, error } = await supabase.from('brews').select(BREW_SELECT).eq('id', id!).maybeSingle()
      if (error) throw error
      return data as BrewWithRelations | null // null = not found (or not yours)
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
      const { error } = await supabase.from('brews').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brews'] }),
  })
}
