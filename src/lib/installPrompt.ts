// Android/Chrome fires "beforeinstallprompt" once, early, when the app is installable.
// We keep that event so a button can show the install dialog later.
// This module is imported in main.tsx so the listener exists before any page renders.
// (iOS never fires this event: there, installing is Share -> Add to Home Screen.)

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // stop Chrome's own mini-banner; we show our own button
  deferred = e as BeforeInstallPromptEvent
  notify()
})

window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

// The two functions useSyncExternalStore needs: subscribe to changes, and read the current value.
export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function canPromptInstall(): boolean {
  return deferred !== null
}

export async function promptInstall() {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  deferred = null // the event can only be used once
  notify()
}

// Already running as an installed app? (iOS uses its own navigator.standalone flag.)
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

// iPhone or iPad (iPads report themselves as Macs, but Macs have no touch screen).
export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}
