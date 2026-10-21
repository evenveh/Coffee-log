import { useSyncExternalStore } from 'react'
import { canPromptInstall, isInstalled, isIos, promptInstall, subscribe } from '../lib/installPrompt'
import { card, primaryButton } from '../lib/styles'

// "Install app" help, tailored to the platform.
export default function InstallCard() {
  // Re-renders this component whenever the install prompt becomes (un)available.
  const canPrompt = useSyncExternalStore(subscribe, canPromptInstall)

  if (isInstalled()) {
    return <p className="text-center text-sm text-stone-500">✓ You're using the installed app.</p>
  }

  return (
    <div className={card}>
      <h3 className="mb-2 font-semibold">Install the app</h3>

      {canPrompt ? (
        // Android / desktop Chrome / Edge: a real install button.
        <>
          <p className="mb-3 text-sm text-stone-600">Add Coffee Log to your home screen. It opens full screen, like a normal app.</p>
          <button onClick={promptInstall} className={primaryButton}>Install</button>
        </>
      ) : isIos() ? (
        // iPhone / iPad: no install button exists, so explain the steps.
        <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-600">
          <li>Tap the <strong>Share</strong> button <span aria-hidden>(□↑)</span> in Safari's toolbar.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong>. Then open Coffee Log from the home screen and sign in once.</li>
        </ol>
      ) : (
        // Other browsers, or Chrome before it decides the app is installable.
        <p className="text-sm text-stone-600">
          On Android, open this page in <strong>Chrome</strong> and choose <strong>Install app</strong> (or <strong>Add to Home screen</strong>) from the ⋮ menu.
          On iPhone, open it in <strong>Safari</strong> and use Share → Add to Home Screen.
        </p>
      )}
    </div>
  )
}
