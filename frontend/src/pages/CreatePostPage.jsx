import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { forumApi, postApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import { normalizeTagInput } from '../utils/format'

function CreatePostPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [forums, setForums] = useState([])
  const [forumId, setForumId] = useState(params.get('forumId') || '')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadForums = async () => {
      try {
        const { data } = await forumApi.list()
        setForums(data)
        setForumId((prevForumId) => prevForumId || data[0]?._id || '')
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Foren konnten nicht geladen werden'))
      }
    }

    loadForums()
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setError('')

      const { data } = await postApi.create({
        title,
        content,
        imageUrl,
        videoUrl,
        forumId,
        tags: normalizeTagInput(tags),
      })

      navigate(`/posts/${data._id}`)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht erstellt werden'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="card stack-md max-w">
      <h1>Neuen Post erstellen</h1>
      <form onSubmit={onSubmit} className="stack-md">
        <select value={forumId} onChange={(event) => setForumId(event.target.value)} required>
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
        />

        <textarea
          rows={5}
          placeholder="Inhalt"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
        />

        <input
          placeholder="Bild-URL (optional)"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
        />

        <input
          placeholder="Video-URL (optional)"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
        />

        <input
          placeholder="Tags, mit Komma getrennt"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />

        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Speichere...' : 'Post erstellen'}</button>
      </form>

      {error && <p className="error-text">{error}</p>}
    </section>
  )
}

export default CreatePostPage
