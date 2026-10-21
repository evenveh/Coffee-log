import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Already signed in (or just finished signing in) -> go to the app.
  if (session) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault() // stop the browser from reloading the page on submit
    setBusy(true)
    setError(null)
    setInfo(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      // On success, AuthProvider receives the new session and the <Navigate> above kicks in.
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      // If "Confirm email" is on in Supabase, there is no session until the email link is clicked.
      else if (!data.session) setInfo('Account created. Check your email to confirm it, then sign in.')
    }
    setBusy(false)
  }

  function switchMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError(null)
    setInfo(null)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pt-[env(safe-area-inset-top)]">
      <h1 className="mb-1 text-3xl font-bold text-coffee-800">☕ Coffee Log</h1>
      <p className="mb-8 text-stone-500">{mode === 'signin' ? 'Sign in to log your brews.' : 'Create your account.'}</p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2"
        />

        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          // Tells password managers whether to fill a saved password or suggest a new one.
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2"
        />

        <button disabled={busy} className="mt-2 rounded-lg bg-coffee-600 py-2 font-semibold text-white disabled:opacity-50">
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button type="button" onClick={switchMode} className="mt-4 text-sm text-stone-500 underline">
        {mode === 'signin' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
      </button>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {info && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{info}</p>}
    </div>
  )
}
