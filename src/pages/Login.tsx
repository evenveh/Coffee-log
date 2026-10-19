import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { session } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already signed in (or just finished signing in) -> go to the app.
  if (session) return <Navigate to="/" replace />

  async function sendEmail(e: FormEvent) {
    e.preventDefault() // stop the browser from reloading the page on submit
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Where the link in the email should send you back to.
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setStep('code')
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(error.message)
    // On success, AuthProvider receives the new session and the <Navigate> above kicks in.
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-3xl font-bold text-coffee-800">☕ Coffee Log</h1>
      <p className="mb-8 text-stone-500">Sign in to log your brews.</p>

      {step === 'email' ? (
        <form onSubmit={sendEmail} className="flex flex-col gap-3">
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
          <button disabled={busy} className="rounded-lg bg-coffee-600 py-2 font-semibold text-white disabled:opacity-50">
            {busy ? 'Sending…' : 'Send sign-in code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-stone-600">
            We sent an email to <strong>{email}</strong>. Enter the code from it, or tap the link in the email.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-center text-2xl tracking-widest"
          />
          <button disabled={busy} className="rounded-lg bg-coffee-600 py-2 font-semibold text-white disabled:opacity-50">
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button type="button" onClick={() => setStep('email')} className="text-sm text-stone-500 underline">
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  )
}
