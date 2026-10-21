import { useSyncExternalStore } from 'react'
import { canPromptInstall, isInstalled, isIos, promptInstall, subscribe } from '../lib/installPrompt'
import { primaryButton, sectionTitle } from '../lib/styles'

// "Install app" help, tailored to the platform.
export default function InstallCard() {
  // Re-renders this component whenever the install prompt becomes (un)available.
  const canPrompt = useSyncExternalStore(subscribe, canPromptInstall)

  return (
    <section className="flex flex-col gap-2">
      <h2 className={sectionTitle}>App</h2>

      {isInstalled() ? (
        <p className="text-sm text-muted">You're using the installed app.</p>
      ) : canPrompt ? (
        // Android / desktop Chrome / Edge: a real install button.
        <>
          <p className="text-sm text-muted">Add Coffee Log to your home screen. It opens full screen, like a normal app.</p>
          <button onClick={promptInstall} className={`${primaryButton} self-start`}>Install app</button>
        </>
      ) : isIos() ? (
        // iPhone / iPad: no install button exists, so explain the steps. A real sequence, so a numbered list.
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Tap the <strong className="text-ink">Share</strong> button in Safari's toolbar.</li>
          <li>Scroll down and tap <strong className="text-ink">Add to Home Screen</strong>.</li>
          <li>Tap <strong className="text-ink">Add</strong>, open Coffee Log from the home screen, and sign in once.</li>
        </ol>
      ) : (
        // Other browsers, or Chrome before it decides the app is installable.
        <p className="text-sm text-muted">
          To install: on Android, open this page in Chrome and choose <strong className="text-ink">Install app</strong> from the ⋮ menu.
          On iPhone, open it in Safari and use Share, then <strong className="text-ink">Add to Home Screen</strong>.
        </p>
      )}
    </section>
  )
}
