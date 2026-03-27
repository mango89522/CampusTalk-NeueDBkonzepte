import { useState } from 'react'
import { toLocalDateTime } from '../utils/format'

function CommentNode({ comment, depth, isLoggedIn, isAdmin, currentUserId, onReply, onReport, onDelete }) {
  const [replyText, setReplyText] = useState('')
  const [isReplyOpen, setIsReplyOpen] = useState(false)
  const isOwnComment = Boolean(currentUserId && String(comment.author?._id || comment.author) === String(currentUserId))
  const canDeleteComment = isOwnComment || isAdmin

  const submitReply = async (event) => {
    event.preventDefault()
    if (!replyText.trim()) return
    await onReply(replyText, comment._id)
    setReplyText('')
    setIsReplyOpen(false)
  }

  return (
    <div id={`comment-${comment._id}`} className="mt-2" style={{ marginLeft: `${depth * 18}px` }}>
      <div className="rounded-xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-3">
        <p className="text-neutral-800">{comment.content}</p>
        <p className="text-sm text-neutral-600">
          {comment.author?.username || 'Unbekannt'} · {toLocalDateTime(comment.createdAt)}
        </p>
        {isLoggedIn && (
          <div className="mt-1 flex flex-wrap gap-3">
            <button
              type="button"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              onClick={() => setIsReplyOpen((prev) => !prev)}
            >
              Antworten
            </button>
            {!canDeleteComment && (
              <button
                type="button"
                className="text-sm font-semibold text-red-700 transition hover:text-red-800"
                onClick={() => onReport?.(comment)}
              >
                Melden
              </button>
            )}
            {canDeleteComment && (
              <button
                type="button"
                className="text-sm font-semibold text-red-700 transition hover:text-red-800"
                onClick={() => onDelete?.(comment)}
              >
                Löschen
              </button>
            )}
          </div>
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
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onReply={onReply}
          onReport={onReport}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function CommentTree({ comments, isLoggedIn, isAdmin, currentUserId, onReply, onReport, onDelete }) {
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
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onReply={onReply}
          onReport={onReport}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

export default CommentTree
