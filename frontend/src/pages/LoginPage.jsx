import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getApiErrorMessage } from '../api/client'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const onSubmit = async (event) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      setError('')
      await login(email, password)
      navigate(from, { replace: true })
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Login fehlgeschlagen'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-6 shadow-sm">
      <h1 className="font-['Space_Grotesk'] text-4xl leading-tight font-bold tracking-tight text-neutral-900">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <button type="submit" disabled={isSubmitting} className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Anmeldung...' : 'Anmelden'}</button>
      </form>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      <p className="text-sm text-neutral-600">Noch keinen Account? <Link className="font-semibold text-emerald-700 hover:underline" to="/register">Registrieren</Link></p>
    </section>
  )
}

export default LoginPage
