import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import GroupSettings from '../components/GroupSettings'
import InstallCard from '../components/InstallCard'
import NamedListEditor from '../components/NamedListEditor'
import { useUser } from '../hooks/useAuth'
import { useProfile, useUpdateDisplayName } from '../hooks/useProfile'
import { friendlyError } from '../lib/format'
import { inputClass, labelClass, pageTitle, secondaryButton, sectionTitle } from '../lib/styles'
import { supabase } from '../lib/supabase'

// Sections divided by hairlines, not cards.
const section = 'flex flex-col gap-3 border-t border-line pt-5'

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

  const profileError = profile.error ?? updateName.error

  return (
    <div className="flex flex-col gap-6">
      <h1 className={pageTitle}>Settings</h1>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Profile</h2>
        <p className="text-sm text-muted">Signed in as {user.email}</p>
        {profile.isLoading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <form onSubmit={save}>
            <label className={labelClass} htmlFor="display_name">Display name</label>
            <div className="flex gap-2">
              <input id="display_name" value={shownName} onChange={(e) => setName(e.target.value)} className={`${inputClass} flex-1`} />
              <button disabled={updateName.isPending || name === null} className={secondaryButton}>
                {updateName.isPending ? 'Saving…' : 'Save name'}
              </button>
            </div>
          </form>
        )}
        {profileError && <p className="text-sm text-danger">{friendlyError(profileError)}</p>}
      </section>

      <div className={section}>
        <GroupSettings />
      </div>

      <div className={section}>
        <p className="text-sm text-muted">
          Archive milks, grinders and brewers instead of deleting them, so older brews keep their details.
        </p>
        <NamedListEditor table="milks" title="Milks" placeholder="Barista oat" />
      </div>

      <div className={section}>
        <NamedListEditor table="grinders" title="Grinders" placeholder="Niche Zero" />
      </div>

      <div className={section}>
        <NamedListEditor table="brewers" title="Brewers" placeholder="Kalita Wave" />
      </div>

      <div className={section}>
        <InstallCard />
      </div>

      <div className={section}>
        <button onClick={signOut} className={secondaryButton}>Sign out</button>
      </div>
    </div>
  )
}
