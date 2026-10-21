import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Bean, BeanInput } from '../lib/types'

// All beans, including archived ones (pages filter as they need).
// Newest roast first; beans without a roast date go last.
export function useBeans() {
  return useQuery({
    queryKey: ['beans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beans')
        .select('*')
        .order('roast_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Bean[]
    },
  })
}

// Create (no id) or update (with id) a bean.
export function useSaveBean() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: BeanInput & { id?: string }) => {
      const { error } = id
        ? await supabase.from('beans').update(input).eq('id', id)
        : await supabase.from('beans').insert(input) // created_by is filled in by the database
      if (error) throw error
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
