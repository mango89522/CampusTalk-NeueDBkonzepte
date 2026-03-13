export function toLocalDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function normalizeTagInput(tagString) {
  if (!tagString?.trim()) return []
  return tagString
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function voteCount(value) {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (!value) return 0

  // Fallbacks for inconsistent payload shapes.
  if (typeof value === 'string') return 1
  if (typeof value === 'object' && value._id) return 1

  return 0
}

export function postScore(post) {
  return voteCount(post?.upvotes) - voteCount(post?.downvotes)
}

export function roleLabel(role) {
  return role || 'Studierender'
}
