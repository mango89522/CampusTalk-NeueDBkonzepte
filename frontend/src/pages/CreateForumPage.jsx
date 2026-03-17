import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { forumApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import { normalizeTagInput } from '../utils/format'

function CreateForumPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      setError('')

      const { data } = await forumApi.create({
        title,
        description,
        tags: normalizeTagInput(tags),
      })

      navigate(`/forums/${data._id}`)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Forum konnte nicht erstellt werden'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-6 shadow-sm">
      <h1 className="font-['Space_Grotesk'] text-4xl leading-tight font-bold tracking-tight text-neutral-900">Neues Forum erstellen</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          placeholder="Titel"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <textarea
          rows={4}
          placeholder="Beschreibung"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <input
          placeholder="Tags, mit Komma getrennt"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <button type="submit" disabled={isSubmitting} className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Erstelle...' : 'Forum erstellen'}</button>
      </form>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
    </section>
  )
}

export default CreateForumPage
