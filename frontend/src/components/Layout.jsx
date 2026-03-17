import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function Layout() {
  const { user, isLoggedIn, isAdmin, unreadPrivateCount, logout } = useAuth()
  const [showToTop, setShowToTop] = useState(false)

  const navClass = ({ isActive }) => {
    const base = 'whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition'
    return isActive
      ? `${base} border-emerald-500 bg-emerald-50 text-emerald-800`
      : `${base} border-transparent text-neutral-700 hover:border-emerald-300 hover:bg-white`
  }

  useEffect(() => {
    const onScroll = () => {
      setShowToTop(window.scrollY > 320)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-4 md:px-7 md:py-6">
      <header className="grid gap-3 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.92)] p-5 shadow-sm backdrop-blur-md md:grid-cols-[auto_1fr_auto] md:items-center md:gap-5">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-neutral-900">
            <img src="/campustalk-logo.svg" alt="CampusTalk Logo" className="h-8 w-8 rounded-lg" />
            <span>CampusTalk</span>
          </Link>
          <p className="mt-0.5 text-sm text-neutral-600">Forum trifft Echtzeit-Chat</p>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Hauptnavigation">
          <NavLink to="/" end className={navClass}>Start</NavLink>
          {isLoggedIn && <NavLink to="/forums/new" className={navClass}>Forum erstellen</NavLink>}
          {isLoggedIn && <NavLink to="/posts/new" className={navClass}>Post erstellen</NavLink>}
          {isLoggedIn && (
            <NavLink to="/messages" className={(state) => `${navClass(state)} relative pr-8`}>
              <span>Private Nachrichten</span>
              {unreadPrivateCount > 0 && (
                <span className="pointer-events-none absolute -top-1 right-1 inline-flex min-w-5 items-center justify-center rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold leading-none text-red-700">
                  {unreadPrivateCount > 99 ? '99+' : unreadPrivateCount}
                </span>
              )}
            </NavLink>
          )}
          {isLoggedIn && <NavLink to="/profile" className={navClass}>Profil</NavLink>}
          {isAdmin && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {isLoggedIn ? (
            <>
              <span className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700">
                {user?.username} ({user?.role})
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-emerald-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-emerald-400"
                to="/login"
              >
                Login
              </Link>
              <Link
                className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5"
                to="/register"
              >
                Registrieren
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="my-10">
        <Outlet />
      </main>

      <footer className="mt-12 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.92)] p-6 shadow-sm">
        <section className="grid gap-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 font-['Space_Grotesk'] text-xl font-bold tracking-tight text-neutral-900">
              <img src="/campustalk-logo.svg" alt="CampusTalk Logo" className="h-6 w-6 rounded" />
              <span>CampusTalk</span>
            </p>
            <p className="mt-2 text-sm text-neutral-600">Foren, Threads und Echtzeit-Chat fuer den Campus-Alltag.</p>
          </div>

          <div>
            <h3 className="text-base font-bold text-neutral-900">Schnellzugriff</h3>
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-600">
              <Link className="hover:text-emerald-700" to="/">Start</Link>
              <Link className="hover:text-emerald-700" to="/posts/new">Post erstellen</Link>
              <Link className="hover:text-emerald-700" to="/forums/new">Forum erstellen</Link>
              <Link className="hover:text-emerald-700" to="/messages">Private Nachrichten</Link>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-neutral-900">Plattform</h3>
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-600">
              <Link className="hover:text-emerald-700" to="/profile">Profil</Link>
              <Link className="hover:text-emerald-700" to="/admin">Admin</Link>
              <a className="hover:text-emerald-700" href="https://www.mongodb.com" target="_blank" rel="noreferrer">MongoDB</a>
              <a className="hover:text-emerald-700" href="https://socket.io" target="_blank" rel="noreferrer">Socket.IO</a>
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-neutral-300 pt-4 text-sm text-neutral-600">
          <p>CampusTalk · gebaut fuer Studierende</p>
          <p>{new Date().getFullYear()} · Hochschule Projekt</p>
        </div>
      </footer>

      {showToTop && (
        <button
          type="button"
          className="fixed right-4 bottom-4 z-40 h-12 w-12 rounded-full border border-emerald-400 bg-white text-xl font-bold text-emerald-800 shadow-lg transition hover:-translate-y-0.5"
          aria-label="Nach oben"
          onClick={scrollToTop}
        >
          ↑
        </button>
      )}
    </div>
  )
}

export default Layout
