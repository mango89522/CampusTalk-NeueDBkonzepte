const LEGACY_STORAGE_KEY = 'campustalk_chat_peers'
const STORAGE_KEY_PREFIX = 'campustalk_chat_peers_'

function getStorageKey(ownerId) {
  return `${STORAGE_KEY_PREFIX}${ownerId || 'anonymous'}`
}

export function getChatPeers(ownerId) {
  try {
    const scopedRaw = localStorage.getItem(getStorageKey(ownerId))
    if (scopedRaw) return JSON.parse(scopedRaw)

    // Backward compatibility: read old global peers when no scoped data exists yet.
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    return legacyRaw ? JSON.parse(legacyRaw) : []
  } catch {
    return []
  }
}

export function upsertChatPeer(peer, ownerId) {
  if (!peer?.id) return

  const normalizedPeer = {
    ...peer,
    id: String(peer.id),
  }

  const peers = getChatPeers(ownerId)
  const existing = peers.find((entry) => String(entry.id) === normalizedPeer.id)

  let updated
  if (existing) {
    updated = peers.map((entry) => (String(entry.id) === normalizedPeer.id ? { ...entry, ...normalizedPeer } : entry))
  } else {
    updated = [normalizedPeer, ...peers]
  }

  localStorage.setItem(getStorageKey(ownerId), JSON.stringify(updated.slice(0, 50)))
}
