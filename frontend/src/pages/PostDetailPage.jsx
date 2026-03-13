import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { commentApi, postApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import PostCard from '../components/PostCard'
import CommentTree from '../components/CommentTree'
import { useAuth } from '../hooks/useAuth'
import { upsertChatPeer } from '../utils/chatPeers'

function PostDetailPage() {
  const { id } = useParams()
  const { isLoggedIn } = useAuth()

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

  const replyToComment = async (text, parentCommentId) => {
    await commentApi.create({ content: text, postId: id, parentCommentId })
    await loadData()
  }

  if (isLoading) return <p>Lade Post...</p>

  return (
    <section className="stack-lg">
      {error && <p className="error-text">{error}</p>}
      {post && (
        <>
          <PostCard
            post={post}
            canVote={isLoggedIn}
            onUpvote={() => vote('up')}
            onDownvote={() => vote('down')}
          />

          {post.author?._id && (
            <Link
              to={`/messages?userId=${post.author._id}&username=${encodeURIComponent(post.author.username || '')}`}
              className="btn-link"
              onClick={() => upsertChatPeer({ id: post.author._id, username: post.author.username || 'User' })}
            >
              Private Nachricht an {post.author.username || 'Autor'}
            </Link>
          )}
        </>
      )}

      <section className="card stack-md">
        <h2>Kommentare</h2>

        {isLoggedIn && (
          <form onSubmit={submitComment} className="stack-sm">
            <textarea
              rows={3}
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Kommentar schreiben"
            />
            <button type="submit">Kommentar senden</button>
          </form>
        )}

        <CommentTree comments={comments} isLoggedIn={isLoggedIn} onReply={replyToComment} />
      </section>
    </section>
  )
}

export default PostDetailPage
