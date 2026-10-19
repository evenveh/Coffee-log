import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'

export type AuthState = {
  session: Session | null // null = not signed in
  loading: boolean // true until we know whether there is a stored session
}

// The "global variable" for auth state. AuthProvider fills it, useAuth() reads it.
export const AuthContext = createContext<AuthState>({ session: null, loading: true })
