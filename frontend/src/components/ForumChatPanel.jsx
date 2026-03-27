import { useEffect, useMemo, useRef, useState } from 'react'
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
  const socketRef = useRef(null)
  const scrollRef = useRef(null)

  const getMessageKey = useMemo(() => {
    return (message) => {
      if (!message) return ''
      return String(message._id || message.id || `${message.senderId || ''}:${message.createdAt || ''}:${message.text || ''}`)
    }
  }, [])

  const mergeMessages = useMemo(() => {
    return (incoming) => {
      setMessages((prev) => {
        const map = new Map(prev.map((entry) => [getMessageKey(entry), entry]))
        incoming.forEach((entry) => {
          map.set(getMessageKey(entry), entry)
        })
        return Array.from(map.values()).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      })
    }
  }, [getMessageKey])

  useEffect(() => {
    if (!isLoggedIn || !forumId) return

    let isMounted = true
    const loadHistory = async () => {
      try {
        const { data } = await forumApi.messages(forumId)
        if (isMounted) mergeMessages(data)
      } catch (apiError) {
        if (isMounted) setError(getApiErrorMessage(apiError, 'Chat-Verlauf konnte nicht geladen werden'))
      }
    }

    loadHistory()

    return () => {
      isMounted = false
    }
  }, [forumId, isLoggedIn, mergeMessages])

  useEffect(() => {
    if (!isLoggedIn || !token || !forumId) return undefined

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.emit('join_forum', forumId)

    const onReceive = (message) => {
      mergeMessages([message])
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
      socketRef.current = null
    }
  }, [forumId, isLoggedIn, token, mergeMessages])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const sendMessage = (event) => {
    event.preventDefault()
    const messageText = text.trim()
    if (!socketRef.current || !messageText) return

    socketRef.current.emit('send_message', { forumId, text: messageText })
    setText('')
  }

  if (!isLoggedIn) {
    return <p className="rounded-xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-4 text-neutral-600">Für den Live-Chat bitte einloggen.</p>
  }

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm">
      <h3 className="font-['Space_Grotesk'] text-2xl leading-tight font-bold tracking-tight text-neutral-900">Live-Chat</h3>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="flex min-h-[250px] max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
        {messages.map((message) => (
          <div key={message._id || message.id} className="rounded-xl border border-neutral-300 bg-white p-3">
            <strong className="text-neutral-900">{message.sender?.username || message.senderUsername || 'User'}</strong>
            <p className="my-1 text-neutral-800">{message.text}</p>
            <span className="text-xs text-neutral-600">{toLocalDateTime(message.createdAt)}</span>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nachricht eingeben"
          className="min-w-[220px] flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <button type="submit" className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5">Senden</button>
      </form>
    </section>
  )
}

export default ForumChatPanel

