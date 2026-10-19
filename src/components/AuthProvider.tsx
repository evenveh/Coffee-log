import { useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type AuthState } from '../lib/auth-context'
import { supabase } from '../lib/supabase'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    // Fires once right away with the stored session (or null), then again on every
    // sign-in, sign-out and token refresh. Also picks up the session from a magic link.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false })
    })
    // Cleanup: stop listening if this component is ever removed.
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
