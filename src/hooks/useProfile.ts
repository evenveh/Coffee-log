import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useUser } from './useAuth'

export type Profile = {
  id: string
  display_name: string | null
}

// Read: the signed-in user's profile row.
export function useProfile() {
  const user = useUser()
  return useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', user.id)
        .single() // we expect exactly one row
      if (error) throw error // React Query turns a thrown error into query.error
      return data as Profile
    },
  })
}

// Write: change the display name, then refresh the cached profile.
export function useUpdateDisplayName() {
  const user = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (displayName: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['group'] }) // the group's member list shows names too
    },
  })
}
