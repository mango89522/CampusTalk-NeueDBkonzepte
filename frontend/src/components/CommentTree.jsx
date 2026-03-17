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
    <div className="mt-2" style={{ marginLeft: `${depth * 18}px` }}>
      <div className="rounded-xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-3">
        <p className="text-neutral-800">{comment.content}</p>
        <p className="text-sm text-neutral-600">
          {comment.author?.username || 'Unbekannt'} · {toLocalDateTime(comment.createdAt)}
        </p>
        {isLoggedIn && (
          <button
            type="button"
            className="mt-1 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
            onClick={() => setIsReplyOpen((prev) => !prev)}
          >
            Antworten
          </button>
        )}

        {isReplyOpen && (
          <form onSubmit={submitReply} className="mt-2 flex flex-wrap gap-2">
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              rows={2}
              placeholder="Antwort schreiben"
              className="min-w-[220px] flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <button type="submit" className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5">
              Antwort senden
            </button>
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
    return <p className="text-neutral-600">Noch keine Kommentare.</p>
  }

  return (
    <div>
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
