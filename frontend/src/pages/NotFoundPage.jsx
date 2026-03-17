import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-6 text-center shadow-sm">
      <h1 className="font-['Space_Grotesk'] text-5xl leading-tight font-bold tracking-tight text-neutral-900">404</h1>
      <p className="text-neutral-700">Diese Seite gibt es nicht.</p>
      <Link to="/" className="inline-flex rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5">
        Zur Startseite
      </Link>
    </section>
  )
}

export default NotFoundPage
