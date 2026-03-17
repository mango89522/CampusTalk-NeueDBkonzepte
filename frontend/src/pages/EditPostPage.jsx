import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { forumApi, postApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import { normalizeTagInput } from '../utils/format'

function EditPostPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [forums, setForums] = useState([])
  const [forumId, setForumId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [forumsRes, postRes] = await Promise.all([
          forumApi.list(),
          postApi.getById(id),
        ])

        const post = postRes.data
        setForums(forumsRes.data)
        setForumId(post.forum?._id || post.forum || '')
        setTitle(post.title || '')
        setContent(post.content || '')
        setImageUrl(post.imageUrl || '')
        setVideoUrl(post.videoUrl || '')
        setTags((post.tags || []).join(', '))
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Post konnte nicht geladen werden'))
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id])

  const onSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setError('')

      await postApi.update(id, {
        title,
        content,
        forumId,
        imageUrl,
        videoUrl,
        tags: normalizeTagInput(tags),
      })

      navigate(`/posts/${id}`)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht aktualisiert werden'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <p className="text-neutral-600">Lade Post...</p>

  return (
    <section className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-6 shadow-sm">
      <h1 className="font-['Space_Grotesk'] text-4xl leading-tight font-bold tracking-tight text-neutral-900">Post bearbeiten</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <select value={forumId} onChange={(event) => setForumId(event.target.value)} required className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
          <option value="">Forum waehlen</option>
          {forums.map((forum) => (
            <option key={forum._id} value={forum._id}>{forum.title}</option>
          ))}
        </select>

        <input
          placeholder="Titel"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <textarea
          rows={5}
          placeholder="Inhalt"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <input
          placeholder="Bild-URL (optional)"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <input
          placeholder="Video-URL (optional)"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <input
          placeholder="Tags, mit Komma getrennt"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <button type="submit" disabled={isSubmitting} className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Speichere...' : 'Aenderungen speichern'}
        </button>
      </form>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
    </section>
  )
}

export default EditPostPage
