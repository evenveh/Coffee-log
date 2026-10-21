import type { ReactNode } from 'react'

// A bar pinned to the bottom of the screen for a form's buttons (replaces the bottom nav on
// form pages). Place it INSIDE the <form>, so a submit button in it still submits the form.
export default function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-xl gap-2">{children}</div>
    </div>
  )
}
