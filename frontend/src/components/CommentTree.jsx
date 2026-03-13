import { useState } from 'react'
import { toLocalDateTime } from '../utils/format'

function CommentNode({ comment, depth, isLoggedIn, onReply }) {
  const [replyText, setReplyText] = useState('')
  const [isReplyOpen, setIsReplyOpen] = useState(false)

  const submitReply = async (event) => {
    event.preventDefault()
    if (!replyText.trim()) return
    await onReply(replyText, comment._id)
    setReplyText('')
    setIsReplyOpen(false)
  }

  return (
    <div className="comment-node" style={{ marginLeft: `${depth * 18}px` }}>
      <div className="comment-card">
        <p>{comment.content}</p>
        <p className="muted">
          {comment.author?.username || 'Unbekannt'} · {toLocalDateTime(comment.createdAt)}
        </p>
        {isLoggedIn && (
          <button type="button" className="link-button" onClick={() => setIsReplyOpen((prev) => !prev)}>
            Antworten
          </button>
        )}

        {isReplyOpen && (
          <form onSubmit={submitReply} className="inline-form">
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              rows={2}
              placeholder="Antwort schreiben"
            />
            <button type="submit">Antwort senden</button>
          </form>
        )}
      </div>

      {comment.replies?.map((reply) => (
        <CommentNode
          key={reply._id}
          comment={reply}
          depth={depth + 1}
          isLoggedIn={isLoggedIn}
          onReply={onReply}
        />
      ))}
    </div>
  )
}

function CommentTree({ comments, isLoggedIn, onReply }) {
  if (!comments.length) {
    return <p className="muted">Noch keine Kommentare.</p>
  }

  return (
    <div className="comment-tree">
      {comments.map((comment) => (
        <CommentNode
          key={comment._id}
          comment={comment}
          depth={0}
          isLoggedIn={isLoggedIn}
          onReply={onReply}
        />
      ))}
    </div>
  )
}

export default CommentTree
