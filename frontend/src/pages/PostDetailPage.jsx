import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { commentApi, postApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import PostCard from '../components/PostCard'
import CommentTree from '../components/CommentTree'
import { useAuth } from '../hooks/useAuth'
import { upsertChatPeer } from '../utils/chatPeers'

function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, isAdmin, user } = useAuth()
  const currentUserId = user?.id || user?._id

  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const [postRes, commentsRes] = await Promise.all([
        postApi.getById(id),
        postApi.comments(id),
      ])

      setPost(postRes.data)
      setComments(commentsRes.data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht geladen werden'))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const canManagePost = useMemo(() => {
    const currentUserId = user?.id || user?._id
    const authorId = post?.author?._id || post?.author
    return Boolean(isAdmin || (currentUserId && authorId && String(currentUserId) === String(authorId)))
  }, [isAdmin, user, post])

  const vote = async (type) => {
    try {
      if (type === 'up') {
        await postApi.upvote(id)
      } else {
        await postApi.downvote(id)
      }
      await loadData()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Bewertung fehlgeschlagen'))
    }
  }

  const submitComment = async (event) => {
    event.preventDefault()

    try {
      await commentApi.create({ content: newComment, postId: id })
      setNewComment('')
      await loadData()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Kommentar konnte nicht erstellt werden'))
    }
  }

  const deletePost = async () => {
    if (!window.confirm('Post wirklich loeschen?')) return

    try {
      await postApi.remove(id)
      navigate('/')
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht geloescht werden'))
    }
  }

  const replyToComment = async (text, parentCommentId) => {
    await commentApi.create({ content: text, postId: id, parentCommentId })
    await loadData()
  }

  if (isLoading) return <p>Lade Post...</p>

  return (
    <section className="space-y-7">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {post && (
        <>
          <PostCard
            post={post}
            canVote={isLoggedIn}
            currentUserId={currentUserId}
            onUpvote={() => vote('up')}
            onDownvote={() => vote('down')}
            canManage={canManagePost}
            editPath={`/posts/${post._id}/edit`}
            onDelete={deletePost}
          />

          {post.author?._id && (
            <Link
              to={`/messages?userId=${post.author._id}&username=${encodeURIComponent(post.author.username || '')}`}
              className="inline-flex rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-emerald-400"
              onClick={() => upsertChatPeer({ id: post.author._id, username: post.author.username || 'User' }, currentUserId)}
            >
              Private Nachricht an {post.author.username || 'Autor'}
            </Link>
          )}
        </>
      )}

      <section className="space-y-4 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm">
        <h2 className="font-['Space_Grotesk'] text-3xl leading-tight font-bold tracking-tight text-neutral-900">Kommentare</h2>

        {isLoggedIn && (
          <form onSubmit={submitComment} className="space-y-2">
            <textarea
              rows={3}
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Kommentar schreiben"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <button type="submit" className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5">Kommentar senden</button>
          </form>
        )}

        <CommentTree comments={comments} isLoggedIn={isLoggedIn} onReply={replyToComment} />
      </section>
    </section>
  )
}

export default PostDetailPage
