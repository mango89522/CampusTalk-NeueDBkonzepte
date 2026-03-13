const STORAGE_KEY = 'campustalk_chat_peers'

export function getChatPeers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function upsertChatPeer(peer) {
  if (!peer?.id) return

  const peers = getChatPeers()
  const existing = peers.find((entry) => entry.id === peer.id)

  let updated
  if (existing) {
    updated = peers.map((entry) => (entry.id === peer.id ? { ...entry, ...peer } : entry))
  } else {
    updated = [peer, ...peers]
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)))
}
