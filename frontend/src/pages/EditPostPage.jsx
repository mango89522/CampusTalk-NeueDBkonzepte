import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { forumApi, postApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import { normalizeTagInput } from '../utils/format'

const IMAGE_MAX_MB = Number(import.meta.env.VITE_MEDIA_IMAGE_MAX_MB) || 10
const VIDEO_MAX_MB = Number(import.meta.env.VITE_MEDIA_VIDEO_MAX_MB) || 80

function EditPostPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [forums, setForums] = useState([])
  const [forumId, setForumId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageSource, setImageSource] = useState('url')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [videoSource, setVideoSource] = useState('url')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
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
        setImageSource(post.imageMediaId ? 'file' : 'url')
        setImageUrl(post.imageMediaId ? '' : post.imageUrl || '')
        setImageFile(null)
        setVideoSource(post.videoMediaId ? 'file' : 'url')
        setVideoUrl(post.videoMediaId ? '' : post.videoUrl || '')
        setVideoFile(null)
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

    if (imageSource === 'file' && imageFile && imageFile.size > IMAGE_MAX_MB * 1024 * 1024) {
      setError(`Bild ist zu groß. Maximal erlaubt: ${IMAGE_MAX_MB} MB`)
      return
    }

    if (videoSource === 'file' && videoFile && videoFile.size > VIDEO_MAX_MB * 1024 * 1024) {
      setError(`Video ist zu groß. Maximal erlaubt: ${VIDEO_MAX_MB} MB`)
      return
    }

    try {
      setIsSubmitting(true)
      setError('')

      const payload = new FormData()
      payload.append('title', title)
      payload.append('content', content)
      payload.append('forumId', forumId)
      payload.append('tags', normalizeTagInput(tags).join(','))

      if (imageSource === 'file' && imageFile) {
        payload.append('image', imageFile)
      } else if (imageSource === 'url') {
        payload.append('imageUrl', imageUrl.trim())
      }

      if (videoSource === 'file' && videoFile) {
        payload.append('video', videoFile)
      } else if (videoSource === 'url') {
        payload.append('videoUrl', videoUrl.trim())
      }

      await postApi.update(id, payload)

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
          <option value="">Forum wählen</option>
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

        <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3.5">
          <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Bildquelle (optional)</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setImageSource('url')
                setImageFile(null)
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                imageSource === 'url'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400'
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setImageSource('file')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                imageSource === 'file'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400'
              }`}
            >
              Datei
            </button>
          </div>

          {imageSource === 'url' ? (
            <input
              placeholder="Bild-URL"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          ) : (
            <div className="space-y-1">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:font-semibold file:text-emerald-800"
              />
              <p className="text-xs text-neutral-600">Maximal {IMAGE_MAX_MB} MB</p>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3.5">
          <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Videoquelle (optional)</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setVideoSource('url')
                setVideoFile(null)
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                videoSource === 'url'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400'
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setVideoSource('file')}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                videoSource === 'file'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400'
              }`}
            >
              Datei
            </button>
          </div>

          {videoSource === 'url' ? (
            <input
              placeholder="Video-URL"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          ) : (
            <div className="space-y-1">
              <input
                type="file"
                accept="video/*"
                onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:font-semibold file:text-emerald-800"
              />
              <p className="text-xs text-neutral-600">Maximal {VIDEO_MAX_MB} MB</p>
            </div>
          )}
        </div>

        <input
          placeholder="Tags, mit Komma getrennt"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <button type="submit" disabled={isSubmitting} className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Speichere...' : 'Änderungen speichern'}
        </button>
      </form>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
    </section>
  )
}

export default EditPostPage
