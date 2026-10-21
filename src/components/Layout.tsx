import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Brews', icon: '☕' },
  { to: '/beans', label: 'Beans', icon: '🫘' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      {/* pt adds the iPhone status-bar/notch height (0 elsewhere) */}
      <header className="sticky top-0 z-10 bg-coffee-800 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 text-coffee-50">
        <h1 className="text-lg font-semibold">Coffee Log</h1>
      </header>

      {/* The current page renders here. Bottom padding leaves room for the nav (+ iPhone home bar). */}
      <main className="flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {/* Bottom tab bar: thumb-friendly on phones. pb keeps the tabs above the iPhone home bar. */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-coffee-100 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-xl">
          {tabs.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center py-2 text-xs ${isActive ? 'font-semibold text-coffee-600' : 'text-stone-500'}`
                }
              >
                <span className="text-xl" aria-hidden>{tab.icon}</span>
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
