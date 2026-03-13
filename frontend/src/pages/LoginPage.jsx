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
    <section className="auth-wrap card">
      <h1>Login</h1>
      <form onSubmit={onSubmit} className="stack-md">
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Anmeldung...' : 'Anmelden'}</button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <p className="muted">Noch keinen Account? <Link to="/register">Registrieren</Link></p>
    </section>
  )
}

export default LoginPage
