import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { NamedItem, NamedTable } from '../lib/types'

// One set of hooks for both milks and grinders: the table name is a parameter.

export function useNamedList(table: NamedTable) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('id, name, archived').order('name')
      if (error) throw error
      return data as NamedItem[]
    },
  })
}

export function useAddNamedItem(table: NamedTable) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from(table).insert({ name })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  })
}

export function useSetNamedItemArchived(table: NamedTable) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from(table).update({ archived }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [table] }),
  })
}
