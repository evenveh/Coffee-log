import { Bean, ChevronLeft, List, Plus, Settings, Users } from 'lucide-react'
import { Link, matchPath, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

// Pages that show a form: the bottom nav hides and the form's StickyActions take its place.
const FORM_ROUTES = ['/brews/new', '/brews/:id/edit', '/beans/new', '/beans/:id']

// The bottom nav's tabs: these show the app name instead of a Back button.
const TOP_LEVEL = ['/', '/beans', '/friends', '/settings']

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  // matchPath is a plain function (not a hook), so it's fine to call it in a loop.
  const isForm = FORM_ROUTES.some((pattern) => matchPath(pattern, location.pathname))
  const isTopLevel = TOP_LEVEL.includes(location.pathname)

  function goBack() {
    // 'default' = the first page opened in this app session (e.g. from a link), so there is
    // no in-app history to go back to. Go to the section's main page instead.
    if (location.key === 'default') navigate(location.pathname.startsWith('/beans') ? '/beans' : '/')
    else navigate(-1)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      {/* Top bar. pt adds the iPhone status-bar/notch height (0 elsewhere). */}
      <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between bg-bg px-2 pt-[env(safe-area-inset-top)]">
        {isTopLevel ? (
          <span className="num px-2 text-xl">Coffee Log</span>
        ) : (
          <button onClick={goBack} className="flex min-h-11 items-center gap-1 rounded-lg pr-3 text-muted">
            <ChevronLeft size={24} aria-hidden />
            Back
          </button>
        )}
      </header>

      {/* The current page. Bottom padding leaves room for the nav or the sticky form actions. */}
      <main className="flex-1 px-4 pt-2 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {!isForm && <BottomNav />}
    </div>
  )
}

function BottomNav() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${isActive ? 'font-semibold text-ink' : 'text-muted'}`

  return (
    // pb keeps the bar above the iPhone home indicator.
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-xl items-center">
        <NavLink to="/" end className={tab}>
          <List size={22} aria-hidden />
          Brews
        </NavLink>

        <NavLink to="/beans" className={tab}>
          <Bean size={22} aria-hidden />
          Beans
        </NavLink>

        {/* The main action, centred where the thumb rests, and raised above the bar. */}
        <div className="flex flex-1 justify-center">
          <Link
            to="/brews/new"
            className="-mt-6 flex flex-col items-center gap-0.5 text-xs font-semibold text-ink"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-crema text-on-crema shadow-md ring-4 ring-bg">
              <Plus size={28} strokeWidth={2.5} aria-hidden />
            </span>
            Log brew
          </Link>
        </div>

        <NavLink to="/friends" className={tab}>
          <Users size={22} aria-hidden />
          Friends
        </NavLink>

        <NavLink to="/settings" className={tab}>
          <Settings size={22} aria-hidden />
          Settings
        </NavLink>
      </div>
    </nav>
  )
}
