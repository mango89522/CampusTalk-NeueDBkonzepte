import { Link } from 'react-router-dom'
import { postScore, toLocalDateTime, voteCount } from '../utils/format'

function PostCard({ post, onUpvote, onDownvote, canVote = false, compact = false }) {
  return (
    <article className={`card post-card ${compact ? 'compact' : ''}`}>
      <div className="post-head">
        <div>
          <Link to={`/posts/${post._id}`} className="post-title">{post.title}</Link>
          <p className="muted">
            von {post.author?.username || 'Unbekannt'} in {post.forum?.title || 'Forum'} · {toLocalDateTime(post.createdAt)}
          </p>
        </div>
        <div className="score-box">
          <span>Punkte: {postScore(post)}</span>
          <span className="muted">{voteCount(post?.upvotes)} ▲ / {voteCount(post?.downvotes)} ▼</span>
        </div>
      </div>

      <p className="post-preview">{post.content}</p>

      {(post.imageUrl || post.videoUrl) && (
        <div className="media-links">
          {post.imageUrl && <a href={post.imageUrl} target="_blank" rel="noreferrer">Bild ansehen</a>}
          {post.videoUrl && <a href={post.videoUrl} target="_blank" rel="noreferrer">Video ansehen</a>}
        </div>
      )}

      <div className="chip-row">
        {(post.tags || []).map((tag) => (
          <span key={`${post._id}-${tag}`} className="chip">#{tag}</span>
        ))}
      </div>

      {canVote && (
        <div className="inline-actions">
          <button type="button" onClick={() => onUpvote(post._id)}>Upvote</button>
          <button type="button" onClick={() => onDownvote(post._id)}>Downvote</button>
        </div>
      )}
    </article>
  )
}

export default PostCard
