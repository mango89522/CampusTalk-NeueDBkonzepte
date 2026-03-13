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
    <section className="card stack-md max-w">
      <h1>Neues Forum erstellen</h1>
      <form onSubmit={onSubmit} className="stack-md">
        <input
          placeholder="Titel"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <textarea
          rows={4}
          placeholder="Beschreibung"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <input
          placeholder="Tags, mit Komma getrennt"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Erstelle...' : 'Forum erstellen'}</button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </section>
  )
}

export default CreateForumPage
