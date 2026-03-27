import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { forumApi, postApi, userApi } from '../api/services'
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
  const [subscriptions, setSubscriptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const chatRefreshTimeoutRef = useRef(null)

  const currentUserId = user?.id || user?._id
  const canManage = useMemo(() => {
    const creatorId = forum?.creator?._id || forum?.creator
    return Boolean(isAdmin || (currentUserId && creatorId && String(currentUserId) === String(creatorId)))
  }, [forum, isAdmin, currentUserId])

  const refreshForumContent = useCallback(async () => {
    const [forumRes, postsRes] = await Promise.all([
      forumApi.getById(id),
      postApi.list({ forumId: id }),
    ])

    setForum(forumRes.data)
    setPosts(postsRes.data)
  }, [id])

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      await refreshForumContent()

      if (isLoggedIn) {
        const { data: subscriptionsData } = await userApi.mySubscriptions()
        setSubscriptions(subscriptionsData)
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Forum konnte nicht geladen werden'))
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn, refreshForumContent])

  const isSubscribed = useMemo(() => {
    return subscriptions.some((entry) => String(entry._id || entry.id) === String(id))
  }, [subscriptions, id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    return () => {
      if (chatRefreshTimeoutRef.current) {
        window.clearTimeout(chatRefreshTimeoutRef.current)
      }
    }
  }, [])

  const handleForumChatActivity = useCallback(() => {
    if (chatRefreshTimeoutRef.current) {
      window.clearTimeout(chatRefreshTimeoutRef.current)
    }

    chatRefreshTimeoutRef.current = window.setTimeout(async () => {
      try {
        await refreshForumContent()
      } catch {
        // Chat messages should still work even if the short forum refresh fails.
      }
    }, 350)
  }, [refreshForumContent])

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
    if (!window.confirm('Forum wirklich löschen?')) return

    try {
      await forumApi.remove(id)
      navigate('/')
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Forum konnte nicht gelöscht werden'))
    }
  }

  const canManagePost = useCallback((post) => {
    if (isAdmin) return true
    const authorId = post?.author?._id || post?.author
    return Boolean(currentUserId && authorId && String(currentUserId) === String(authorId))
  }, [isAdmin, currentUserId])

  const deletePost = async (postId) => {
    if (!window.confirm('Post wirklich löschen?')) return

    try {
      await postApi.remove(postId)
      setPosts((prev) => prev.filter((post) => String(post._id) !== String(postId)))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht gelöscht werden'))
    }
  }

  const toggleSubscription = async () => {
    try {
      if (isSubscribed) {
        await forumApi.unsubscribe(id)
      } else {
        await forumApi.subscribe(id)
      }

      const { data } = await userApi.mySubscriptions()
      setSubscriptions(data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Abo konnte nicht aktualisiert werden'))
    }
  }

  const reportPost = async (post) => {
    const reason = window.prompt('Warum möchtest du diesen Post melden? (optional)') || ''

    try {
      await postApi.report(post._id, reason)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht gemeldet werden'))
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
            {isLoggedIn && (
              <button
                type="button"
                onClick={toggleSubscription}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-emerald-400"
              >
                {isSubscribed ? 'Abo entfernen' : 'Forum abonnieren'}
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={deleteForum}
                className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5"
              >
                Forum löschen
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
              onReport={isLoggedIn && !canManagePost(post) ? reportPost : undefined}
            />
          ))}
          {!posts.length && <p className="text-neutral-600">Noch keine Posts vorhanden.</p>}
        </section>

        <ForumChatPanel forumId={id} token={token} isLoggedIn={isLoggedIn} onForumMessage={handleForumChatActivity} />
      </div>
    </section>
  )
}

export default ForumDetailPage
