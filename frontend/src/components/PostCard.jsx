import { memo } from 'react'
import { Link } from 'react-router-dom'
import { postScore, toLocalDateTime, voteCount } from '../utils/format'

function PostCard({ post, onUpvote, onDownvote, canVote = false, currentUserId = '', canManage = false, editPath = '', onDelete }) {
  const authorId = post?.author?._id || post?.author
  const isOwnPost = Boolean(currentUserId && authorId && String(currentUserId) === String(authorId))
  const hasUpvoted = (post?.upvotes || []).some((id) => String(id) === String(currentUserId))
  const hasDownvoted = (post?.downvotes || []).some((id) => String(id) === String(currentUserId))

  return (
    <article className="rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <Link to={`/posts/${post._id}`} className="font-['Space_Grotesk'] text-lg leading-tight font-bold text-neutral-900 hover:text-emerald-800">
            {post.title}
          </Link>
          <p className="mt-1 text-sm text-neutral-600">
            von {post.author?.username || 'Unbekannt'} in {post.forum?.title || 'Forum'} · {toLocalDateTime(post.createdAt)}
          </p>
        </div>
        <div className="text-sm md:text-right">
          <p className="font-semibold text-neutral-800">Punkte: {postScore(post)}</p>
          <p className="text-neutral-600">{voteCount(post?.upvotes)} ▲ / {voteCount(post?.downvotes)} ▼</p>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-[1.03rem] leading-relaxed text-neutral-800">{post.content}</p>

      {(post.imageUrl || post.videoUrl) && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {post.imageUrl && (
            <a className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2" href={post.imageUrl} target="_blank" rel="noreferrer">
              Bild ansehen
            </a>
          )}
          {post.videoUrl && (
            <a className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2" href={post.videoUrl} target="_blank" rel="noreferrer">
              Video ansehen
            </a>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {(post.tags || []).map((tag) => (
          <span key={`${post._id}-${tag}`} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700">
            #{tag}
          </span>
        ))}
      </div>

      {canVote && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onUpvote(post._id)}
            disabled={isOwnPost}
            className={`rounded-xl border px-4 py-2 font-semibold transition ${
              hasUpvoted
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-neutral-300 bg-white text-neutral-800 hover:-translate-y-0.5 hover:border-emerald-400'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Upvote
          </button>
          <button
            type="button"
            onClick={() => onDownvote(post._id)}
            disabled={isOwnPost}
            className={`rounded-xl border px-4 py-2 font-semibold transition ${
              hasDownvoted
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-neutral-300 bg-white text-neutral-800 hover:-translate-y-0.5 hover:border-emerald-400'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Downvote
          </button>
          {isOwnPost && <span className="self-center text-xs font-medium text-neutral-600">Eigene Posts koennen nicht bewertet werden.</span>}
        </div>
      )}

      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
          {editPath && (
            <Link
              to={editPath}
              className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5"
            >
              Bearbeiten
            </Link>
          )}
          <button
            type="button"
            onClick={() => onDelete?.(post._id)}
            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5"
          >
            Loeschen
          </button>
        </div>
      )}
    </article>
  )
}

export default memo(PostCard)
