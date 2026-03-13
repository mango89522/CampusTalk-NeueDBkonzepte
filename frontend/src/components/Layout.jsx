import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function Layout() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth()
  const [showToTop, setShowToTop] = useState(false)

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
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <Link to="/" className="brand">CampusTalk</Link>
          <p className="brand-sub">Forum trifft Echtzeit-Chat</p>
        </div>

        <nav className="main-nav" aria-label="Hauptnavigation">
          <NavLink to="/" end>Start</NavLink>
          {isLoggedIn && <NavLink to="/forums/new">Forum erstellen</NavLink>}
          {isLoggedIn && <NavLink to="/posts/new">Post erstellen</NavLink>}
          {isLoggedIn && <NavLink to="/messages">Private Nachrichten</NavLink>}
          {isLoggedIn && <NavLink to="/profile">Profil</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>

        <div className="user-actions">
          {isLoggedIn ? (
            <>
              <span className="user-pill">{user?.username} ({user?.role})</span>
              <button type="button" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn-link" to="/login">Login</Link>
              <Link className="btn-link primary" to="/register">Registrieren</Link>
            </>
          )}
        </div>
      </header>

      <main className="page-wrap">
        <Outlet />
      </main>

      <footer className="site-footer">
        <section className="footer-grid">
          <div className="footer-brand">
            <p className="brand">CampusTalk</p>
            <p className="muted">Foren, Threads und Echtzeit-Chat fuer den Campus-Alltag.</p>
          </div>

          <div>
            <h3>Schnellzugriff</h3>
            <div className="footer-links">
              <Link to="/">Start</Link>
              <Link to="/posts/new">Post erstellen</Link>
              <Link to="/forums/new">Forum erstellen</Link>
              <Link to="/messages">Private Nachrichten</Link>
            </div>
          </div>

          <div>
            <h3>Plattform</h3>
            <div className="footer-links">
              <Link to="/profile">Profil</Link>
              <Link to="/admin">Admin</Link>
              <a href="https://www.mongodb.com" target="_blank" rel="noreferrer">MongoDB</a>
              <a href="https://socket.io" target="_blank" rel="noreferrer">Socket.IO</a>
            </div>
          </div>
        </section>

        <div className="footer-meta">
          <p>CampusTalk · gebaut fuer Studierende</p>
          <p>{new Date().getFullYear()} · Hochschule Projekt</p>
        </div>
      </footer>

      {showToTop && (
        <button
          type="button"
          className="to-top-btn"
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
