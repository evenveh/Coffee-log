import { useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type AuthState } from '../lib/auth-context'
import { persister, queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    // Fires once right away with the stored session (or null), then again on every
    // sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Forget cached data, in memory and on the device, so the next user here sees nothing of yours.
      // Here rather than in Settings, so it also runs when the session ends on its own.
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        persister.removeClient()
      }
      setState({ session, loading: false })
    })
    // Cleanup: stop listening if this component is ever removed.
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
