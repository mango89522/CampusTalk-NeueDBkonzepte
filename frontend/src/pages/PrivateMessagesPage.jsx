import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { useSearchParams } from 'react-router-dom'
import { API_BASE_URL, getApiErrorMessage } from '../api/client'
import { postApi, privateMessageApi } from '../api/services'
import { useAuth } from '../hooks/useAuth'
import { getChatPeers, upsertChatPeer } from '../utils/chatPeers'
import { toLocalDateTime } from '../utils/format'

const SOCKET_URL = API_BASE_URL.replace('/api', '')

function PrivateMessagesPage() {
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialPeerId = searchParams.get('userId') || ''
  const initialPeerName = searchParams.get('username') || 'User'

  const [peers, setPeers] = useState(() => {
    if (initialPeerId) {
      upsertChatPeer({ id: initialPeerId, username: initialPeerName })
    }

    return getChatPeers()
  })
  const [selectedPeerId, setSelectedPeerId] = useState(initialPeerId)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const { data } = await postApi.list()
        const map = new Map()

        data.forEach((post) => {
          const authorId = post.author?._id
          if (!authorId) return
          if (String(authorId) === String(user?.id || user?._id)) return

          map.set(authorId, {
            id: authorId,
            username: post.author?.username || 'User',
          })
        })

        map.forEach((entry) => upsertChatPeer(entry))
        setPeers(getChatPeers())
      } catch {
        // Nicht kritisch: Seite funktioniert auch mit bereits bekannten Chat-Partnern.
      }
    }

    loadCandidates()
  }, [user])

  useEffect(() => {
    if (!selectedPeerId) return

    const loadConversation = async () => {
      try {
        const { data } = await privateMessageApi.conversation(selectedPeerId)
        setMessages(data)
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Nachrichten konnten nicht geladen werden'))
      }
    }

    loadConversation()
  }, [selectedPeerId])

  const socket = useMemo(() => {
    if (!token) return null

    return io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })
  }, [token])

  useEffect(() => {
    if (!socket) return undefined

    socket.emit('register_private')

    const onReceive = (message) => {
      const currentUserId = user?.id || user?._id
      const otherId = String(message.senderId) === String(currentUserId)
        ? message.recipientId
        : message.senderId

      upsertChatPeer({ id: otherId, username: message.senderUsername || 'User' })
      setPeers(getChatPeers())

      if (String(otherId) === String(selectedPeerId)) {
        setMessages((prev) => [...prev, message])
      }
    }

    const onSocketError = (payload) => {
      setError(payload?.message || 'Socket-Fehler')
    }

    socket.on('receive_private_message', onReceive)
    socket.on('socket_error', onSocketError)

    return () => {
      socket.off('receive_private_message', onReceive)
      socket.off('socket_error', onSocketError)
      socket.disconnect()
    }
  }, [socket, user, selectedPeerId])

  const selectedPeer = peers.find((peer) => String(peer.id) === String(selectedPeerId))

  const selectPeer = (peerId) => {
    setSelectedPeerId(peerId)
    setMessages([])
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!socket || !selectedPeerId || !text.trim()) return

    socket.emit('send_private_message', {
      recipientId: selectedPeerId,
      text,
    })

    setText('')
  }

  return (
    <section className="grid-two">
      <aside className="card stack-sm">
        <h2>Konversationen</h2>
        {!peers.length && <p className="muted">Noch keine Kontakte. Starte aus einem Post heraus eine Nachricht.</p>}
        {peers.map((peer) => (
          <button
            type="button"
            key={peer.id}
            className={`peer-btn ${String(selectedPeerId) === String(peer.id) ? 'active' : ''}`}
            onClick={() => selectPeer(peer.id)}
          >
            {peer.username}
          </button>
        ))}
      </aside>

      <section className="card stack-md">
        <h1>Private Nachrichten {selectedPeer ? `mit ${selectedPeer.username}` : ''}</h1>
        {error && <p className="error-text">{error}</p>}

        <div className="chat-list tall">
          {messages.map((message) => {
            const senderName = message.sender?.username || message.senderUsername || 'User'
            return (
              <div key={message._id || message.id} className="chat-msg">
                <strong>{senderName}</strong>
                <p>{message.text}</p>
                <span>{toLocalDateTime(message.createdAt)}</span>
              </div>
            )
          })}
          {!messages.length && <p className="muted">Noch keine Nachrichten.</p>}
        </div>

        <form onSubmit={sendMessage} className="inline-form">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Nachricht eingeben"
            disabled={!selectedPeerId}
          />
          <button type="submit" disabled={!selectedPeerId}>Senden</button>
        </form>
      </section>
    </section>
  )
}

export default PrivateMessagesPage
