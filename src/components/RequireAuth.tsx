import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Wrap pages that need a signed-in user. This is a UX guard only;
// the real protection is Row Level Security in the database.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <p className="p-8 text-center text-stone-500">Loading…</p>
  if (!session) return <Navigate to="/login" replace />
  return children
}
