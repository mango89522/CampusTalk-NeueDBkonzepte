import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="card stack-md max-w">
      <h1>404</h1>
      <p>Diese Seite gibt es nicht.</p>
      <Link to="/" className="btn-link primary">Zur Startseite</Link>
    </section>
  )
}

export default NotFoundPage
