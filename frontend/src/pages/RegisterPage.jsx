import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setError('')
      await register(username, email, password)
      navigate('/login')
    } catch (registerError) {
      setError(registerError.message || 'Registrierung fehlgeschlagen')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-wrap card">
      <h1>Registrieren</h1>
      <form onSubmit={onSubmit} className="stack-md">
        <input
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
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
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sende...' : 'Account erstellen'}</button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <p className="muted">Schon registriert? <Link to="/login">Zum Login</Link></p>
    </section>
  )
}

export default RegisterPage
