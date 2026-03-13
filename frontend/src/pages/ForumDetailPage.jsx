import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { forumApi, postApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import PostCard from '../components/PostCard'
import ForumChatPanel from '../components/ForumChatPanel'

function ForumDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, token, isLoggedIn, isAdmin } = useAuth()

  const [forum, setForum] = useState(null)
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const currentUserId = user?.id || user?._id
  const canManage = useMemo(() => {
    const creatorId = forum?.creator?._id || forum?.creator
    return Boolean(isAdmin || (currentUserId && creatorId && String(currentUserId) === String(creatorId)))
  }, [forum, isAdmin, currentUserId])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const [forumRes, postsRes] = await Promise.all([
        forumApi.getById(id),
        postApi.list({ forumId: id }),
      ])

      setForum(forumRes.data)
      setPosts(postsRes.data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Forum konnte nicht geladen werden'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const vote = async (postId, type) => {
    try {
      if (type === 'up') {
        await postApi.upvote(postId)
      } else {
        await postApi.downvote(postId)
      }
      await loadData()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Bewertung fehlgeschlagen'))
    }
  }

  const deleteForum = async () => {
    if (!window.confirm('Forum wirklich loeschen?')) return

    try {
      await forumApi.remove(id)
      navigate('/')
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Forum konnte nicht geloescht werden'))
    }
  }

  if (isLoading) return <p>Lade Forum...</p>

  return (
    <section className="stack-lg">
      {error && <p className="error-text">{error}</p>}

      {forum && (
        <header className="card stack-sm">
          <h1>{forum.title}</h1>
          <p>{forum.description}</p>
          <div className="chip-row">
            {(forum.tags || []).map((tag) => (
              <span className="chip" key={tag}>#{tag}</span>
            ))}
          </div>
          <p className="muted">Erstellt von {forum.creator?.username || 'Unbekannt'}</p>

          <div className="inline-actions">
            {isLoggedIn && <Link className="btn-link primary" to={`/posts/new?forumId=${forum._id}`}>Post in diesem Forum</Link>}
            {canManage && <button type="button" onClick={deleteForum}>Forum loeschen</button>}
          </div>
        </header>
      )}

      <div className="grid-two">
        <section className="stack-md">
          <h2>Posts im Forum</h2>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              canVote={isLoggedIn}
              onUpvote={(postId) => vote(postId, 'up')}
              onDownvote={(postId) => vote(postId, 'down')}
            />
          ))}
          {!posts.length && <p className="muted">Noch keine Posts vorhanden.</p>}
        </section>

        <ForumChatPanel forumId={id} token={token} isLoggedIn={isLoggedIn} />
      </div>
    </section>
  )
}

export default ForumDetailPage
