import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { BrewWithRelations, Group, GroupMember } from '../lib/types'
import { useUser } from './useAuth'
import { BREW_SELECT } from './useBrews'

// Everything that changes when you create, join or leave a group.
const GROUP_KEYS = [['group'], ['friend-brews']]

// My group, or null if I'm not in one.
export function useMyGroup() {
  const user = useUser()
  return useQuery({
    queryKey: ['group'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('group:groups(id, name, invite_code)')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return (data as { group: Group } | null)?.group ?? null
    },
  })
}

// Everyone in my group, with display names. Two requests: group_members points at
// auth.users, not profiles, so Supabase can't join the names in for us.
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', 'members', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data: members, error } = await supabase.from('group_members').select('user_id').eq('group_id', groupId!)
      if (error) throw error
      const ids = members.map((m) => m.user_id as string)
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, display_name').in('id', ids)
      if (profileError) throw profileError
      return profiles as GroupMember[]
    },
  })
}

// My group's brews, newest first, without my own. RLS only returns brews from my group.
// Not under ['brews'], so it stays separate from my own log's cache.
export function useFriendBrews() {
  const user = useUser()
  return useQuery({
    queryKey: ['friend-brews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brews')
        .select(BREW_SELECT)
        .neq('user_id', user.id)
        .order('brewed_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as BrewWithRelations[]
    },
  })
}

function useInvalidateGroup() {
  const queryClient = useQueryClient()
  return () => Promise.all(GROUP_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

// Creating and joining go through database functions, which check the rules
// (one group per user, a valid invite code) and give readable errors.
export function useCreateGroup() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.rpc('create_group', { group_name: name })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useJoinGroup() {
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.rpc('join_group', { code })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useLeaveGroup() {
  const user = useUser()
  const invalidate = useInvalidateGroup()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('group_members').delete().eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
