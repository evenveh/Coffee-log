import { useContext } from 'react'
import { AuthContext } from '../lib/auth-context'

export function useAuth() {
  return useContext(AuthContext)
}

// For pages behind RequireAuth, where a signed-in user is guaranteed.
export function useUser() {
  const { session } = useAuth()
  if (!session) throw new Error('useUser() used outside a signed-in page')
  return session.user
}
