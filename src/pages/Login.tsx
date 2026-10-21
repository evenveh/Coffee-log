import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { inputClass, labelClass, primaryButton, textButton } from '../lib/styles'
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
      <img src="/logo.svg" alt="" className="mb-5 size-16 rounded-2xl" />
      {/* The wordmark uses the same condensed numerals style as the recipes. */}
      <h1 className="num text-5xl leading-none">Coffee Log</h1>
      <p className="mt-2 mb-8 text-muted">
        {mode === 'signin' ? 'Sign in to your brew log.' : 'Create an account to start your brew log.'}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            // Tells password managers whether to fill a saved password or suggest a new one.
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === 'signup' && <p className="mt-1 text-sm text-muted">At least 6 characters.</p>}
        </div>

        <button disabled={busy} className={`${primaryButton} mt-2`}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-lg border border-danger/40 p-3 text-sm text-danger">{error}</p>}
      {info && <p role="status" className="mt-4 rounded-lg border border-line p-3 text-sm">{info}</p>}

      <button type="button" onClick={switchMode} className={`${textButton} mt-4 self-start`}>
        {mode === 'signin' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
