import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useUser } from '../hooks/useAuth'
import { useProfile, useUpdateDisplayName } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const user = useUser()
  const profile = useProfile()
  const updateName = useUpdateDisplayName()
  const queryClient = useQueryClient()

  // null = "not edited yet", so the input shows the saved name until you type.
  const [name, setName] = useState<string | null>(null)
  const shownName = name ?? profile.data?.display_name ?? ''

  function save(e: FormEvent) {
    e.preventDefault()
    updateName.mutate(shownName.trim(), { onSuccess: () => setName(null) })
  }

  async function signOut() {
    await supabase.auth.signOut()
    queryClient.clear() // forget cached data so the next user on this device sees nothing of yours
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Profile</h3>
        <p className="mb-3 text-sm text-stone-500">Signed in as {user.email}</p>

        {profile.isLoading ? (
          <p className="text-stone-500">Loading…</p>
        ) : (
          <form onSubmit={save} className="flex gap-2">
            <input
              aria-label="Display name"
              value={shownName}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2"
            />
            <button
              disabled={updateName.isPending || name === null}
              className="rounded-lg bg-coffee-600 px-4 font-semibold text-white disabled:opacity-50"
            >
              {updateName.isPending ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
        {(profile.error || updateName.error) && (
          <p className="mt-2 text-sm text-red-700">{(profile.error ?? updateName.error)?.message}</p>
        )}
      </div>

      <p className="text-sm text-stone-500">Milks and grinders come in Phase 4.</p>

      <button onClick={signOut} className="rounded-lg border border-stone-300 bg-white py-2 font-medium text-stone-700">
        Sign out
      </button>
    </section>
  )
}
