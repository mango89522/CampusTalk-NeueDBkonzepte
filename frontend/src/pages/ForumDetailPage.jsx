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

  const canManagePost = useCallback((post) => {
    if (isAdmin) return true
    const authorId = post?.author?._id || post?.author
    return Boolean(currentUserId && authorId && String(currentUserId) === String(authorId))
  }, [isAdmin, currentUserId])

  const deletePost = async (postId) => {
    if (!window.confirm('Post wirklich loeschen?')) return

    try {
      await postApi.remove(postId)
      setPosts((prev) => prev.filter((post) => String(post._id) !== String(postId)))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht geloescht werden'))
    }
  }

  if (isLoading) return <p>Lade Forum...</p>

  return (
    <section className="space-y-7">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {forum && (
        <header className="space-y-3 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-6 shadow-sm">
          <h1 className="font-['Space_Grotesk'] text-4xl leading-tight font-bold tracking-tight text-neutral-900">{forum.title}</h1>
          <p className="text-neutral-700">{forum.description}</p>
          <div className="flex flex-wrap gap-2">
            {(forum.tags || []).map((tag) => (
              <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700" key={tag}>#{tag}</span>
            ))}
          </div>
          <p className="text-sm text-neutral-600">Erstellt von {forum.creator?.username || 'Unbekannt'}</p>

          <div className="flex flex-wrap gap-2">
            {isLoggedIn && (
              <Link className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5" to={`/posts/new?forumId=${forum._id}`}>
                Post in diesem Forum
              </Link>
            )}
            {canManage && (
              <button
                type="button"
                onClick={deleteForum}
                className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5"
              >
                Forum loeschen
              </button>
            )}
          </div>
        </header>
      )}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.24fr)_minmax(0,1fr)] lg:items-start">
        <section className="space-y-4">
          <h2 className="font-['Space_Grotesk'] text-3xl leading-tight font-bold tracking-tight text-neutral-900">Posts im Forum</h2>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              canVote={isLoggedIn}
              currentUserId={currentUserId}
              onUpvote={(postId) => vote(postId, 'up')}
              onDownvote={(postId) => vote(postId, 'down')}
              canManage={canManagePost(post)}
              editPath={`/posts/${post._id}/edit`}
              onDelete={deletePost}
            />
          ))}
          {!posts.length && <p className="text-neutral-600">Noch keine Posts vorhanden.</p>}
        </section>

        <ForumChatPanel forumId={id} token={token} isLoggedIn={isLoggedIn} />
      </div>
    </section>
  )
}

export default ForumDetailPage
