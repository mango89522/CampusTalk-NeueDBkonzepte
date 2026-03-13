import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { API_BASE_URL } from '../api/client'
import { forumApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import { toLocalDateTime } from '../utils/format'

const SOCKET_URL = API_BASE_URL.replace('/api', '')

function ForumChatPanel({ forumId, token, isLoggedIn }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const socket = useMemo(() => {
    if (!isLoggedIn || !token || !forumId) return null
    return io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })
  }, [forumId, token, isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn || !forumId) return

    let isMounted = true
    const loadHistory = async () => {
      try {
        const { data } = await forumApi.messages(forumId)
        if (isMounted) setMessages(data)
      } catch (apiError) {
        if (isMounted) setError(getApiErrorMessage(apiError, 'Chat-Verlauf konnte nicht geladen werden'))
      }
    }

    loadHistory()

    return () => {
      isMounted = false
    }
  }, [forumId, isLoggedIn])

  useEffect(() => {
    if (!socket) return undefined

    socket.emit('join_forum', forumId)

    const onReceive = (message) => {
      setMessages((prev) => [...prev, message])
    }

    const onSocketError = (payload) => {
      setError(payload?.message || 'Socket-Fehler')
    }

    socket.on('receive_message', onReceive)
    socket.on('socket_error', onSocketError)

    return () => {
      socket.off('receive_message', onReceive)
      socket.off('socket_error', onSocketError)
      socket.disconnect()
    }
  }, [forumId, socket])

  const sendMessage = (event) => {
    event.preventDefault()
    if (!socket || !text.trim()) return

    socket.emit('send_message', { forumId, text })
    setText('')
  }

  if (!isLoggedIn) {
    return <p className="muted">Für den Live-Chat bitte einloggen.</p>
  }

  return (
    <section className="card chat-panel">
      <h3>Live-Chat</h3>
      {error && <p className="error-text">{error}</p>}

      <div className="chat-list">
        {messages.map((message) => (
          <div key={message._id || message.id} className="chat-msg">
            <strong>{message.sender?.username || message.senderUsername || 'User'}</strong>
            <p>{message.text}</p>
            <span>{toLocalDateTime(message.createdAt)}</span>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="inline-form">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nachricht eingeben"
        />
        <button type="submit">Senden</button>
      </form>
    </section>
  )
}

export default ForumChatPanel
