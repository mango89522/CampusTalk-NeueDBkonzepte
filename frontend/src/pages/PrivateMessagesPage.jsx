import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useSearchParams } from 'react-router-dom'
import { API_BASE_URL, getApiErrorMessage } from '../api/client'
import { privateMessageApi, userApi } from '../api/services'
import { useAuth } from '../hooks/useAuth'
import { toLocalDateTime } from '../utils/format'

const SOCKET_URL = API_BASE_URL.replace('/api', '')

function PrivateMessagesPage() {
  const { token, user, refreshUnreadPrivateCount } = useAuth()
  const currentUserId = user?.id || user?._id || ''
  const [searchParams, setSearchParams] = useSearchParams()
  const queryPeerId = searchParams.get('userId') || ''
  const queryPeerName = searchParams.get('username') || 'User'
  const socketRef = useRef(null)
  const scrollRef = useRef(null)

  const [conversations, setConversations] = useState([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)

  const selectedPeerId = queryPeerId && String(queryPeerId) !== String(currentUserId)
    ? queryPeerId
    : ''

  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true)
      const { data } = await privateMessageApi.conversations(100)
      setConversations(data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Konversationen konnten nicht geladen werden'))
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  const getMessageKey = useMemo(() => {
    return (message) => {
      if (!message) return ''
      return String(message._id || message.id || `${message.senderId || message.sender?._id || ''}:${message.recipientId || message.recipient?._id || ''}:${message.createdAt || ''}:${message.text || ''}`)
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

  const reloadConversation = useCallback(async (peerId) => {
    if (!peerId) return

    try {
      setError('')
      const { data } = await privateMessageApi.conversation(peerId)
      setMessages(data)
      await loadConversations()
      await refreshUnreadPrivateCount()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Nachrichten konnten nicht geladen werden'))
    }
  }, [loadConversations, refreshUnreadPrivateCount])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (selectedPeerId || !conversations.length) return

    const firstConversation = conversations[0]
    if (!firstConversation?.user?.id) return

    setSearchParams({
      userId: String(firstConversation.user.id),
      username: firstConversation.user.username || 'User',
    }, { replace: true })
  }, [selectedPeerId, conversations, setSearchParams])

  useEffect(() => {
    if (!selectedPeerId) return
    reloadConversation(selectedPeerId)
  }, [selectedPeerId, reloadConversation])

  useEffect(() => {
    if (!token) return undefined

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.emit('register_private')

    const onReceive = (message) => {
      const currentUserId = user?.id || user?._id
      const otherId = String(message.senderId) === String(currentUserId)
        ? message.recipientId
        : message.senderId

      if (String(otherId) === String(selectedPeerId)) {
        mergeMessages([message])
      }

      loadConversations()
      refreshUnreadPrivateCount()
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
      socketRef.current = null
    }
  }, [token, user, selectedPeerId, mergeMessages, loadConversations, refreshUnreadPrivateCount])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const selectedConversation = conversations.find((entry) => String(entry.user?.id) === String(selectedPeerId))
  const selectedPeer = selectedConversation?.user || (selectedPeerId ? { id: selectedPeerId, username: queryPeerName } : null)

  const selectPeer = (peerId, username) => {
    if (String(peerId) === String(currentUserId)) return

    if (String(peerId) === String(selectedPeerId)) {
      reloadConversation(peerId)
      return
    }

    setSearchParams({
      userId: String(peerId),
      username: username || 'User',
    })
    setMessages([])
  }

  const searchUsers = async (event) => {
    event.preventDefault()
    const query = userSearch.trim()

    if (!query) {
      setSearchResults([])
      return
    }

    try {
      setIsSearchingUsers(true)
      const { data } = await userApi.search(query, 12)
      setSearchResults(data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Users konnten nicht gesucht werden'))
    } finally {
      setIsSearchingUsers(false)
    }
  }

  const selectSearchResult = (entry) => {
    if (String(entry.id) === String(selectedPeerId)) {
      setSearchResults([])
      setUserSearch('')
      reloadConversation(entry.id)
      return
    }

    setSearchParams({
      userId: String(entry.id),
      username: entry.username || 'User',
    })
    setSearchResults([])
    setUserSearch('')
    setMessages([])
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const messageText = text.trim()
    if (!socketRef.current || !selectedPeerId || !messageText) return

    socketRef.current.emit('send_private_message', {
      recipientId: selectedPeerId,
      text: messageText,
    })

    setText('')
    loadConversations()
  }

  const listEntries = useMemo(() => {
    const byConversation = conversations.map((entry) => ({
      id: String(entry.user?.id),
      username: entry.user?.username || 'User',
      unreadCount: entry.unreadCount || 0,
      lastMessageAt: entry.lastMessage?.createdAt,
      lastMessageText: entry.lastMessage?.text || '',
    }))

    if (!selectedPeerId || byConversation.some((entry) => String(entry.id) === String(selectedPeerId))) {
      return byConversation
    }

    return [{
      id: String(selectedPeerId),
      username: queryPeerName || 'User',
      unreadCount: 0,
      lastMessageAt: null,
      lastMessageText: '',
    }, ...byConversation]
  }, [conversations, selectedPeerId, queryPeerName])

  return (
    <section className="grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] lg:items-start">
      <aside className="space-y-3 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm">
        <h2 className="font-['Space_Grotesk'] text-3xl leading-tight font-bold tracking-tight text-neutral-900">Konversationen</h2>
        <form onSubmit={searchUsers} className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
          <div className="flex gap-2">
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="User suchen (Name)"
              className="min-w-[120px] flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <button type="submit" className="rounded-xl border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5">
              Suchen
            </button>
          </div>
          {isSearchingUsers && <p className="text-xs text-neutral-600">Suche...</p>}
          {!!searchResults.length && (
            <div className="flex max-h-44 flex-col overflow-y-auto rounded-lg border border-neutral-200">
              {searchResults.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="flex justify-between border-b border-neutral-200 px-3 py-2 text-left text-sm text-neutral-700 last:border-b-0 hover:bg-emerald-50"
                  onClick={() => selectSearchResult(entry)}
                >
                  <span>{entry.username}</span>
                  <span className="text-xs text-neutral-500">{entry.role}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {isLoadingConversations && <p className="text-sm text-neutral-600">Lade Konversationen...</p>}
        {!isLoadingConversations && !listEntries.length && <p className="text-sm text-neutral-600">Noch keine Konversationen. Suche oben nach einem User.</p>}
        {listEntries.map((entry) => (
          <button
            type="button"
            key={entry.id}
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
              String(selectedPeerId) === String(entry.id)
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400'
            }`}
            onClick={() => selectPeer(entry.id, entry.username)}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate">{entry.username}</span>
              {entry.unreadCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-bold text-red-700">
                  {entry.unreadCount > 99 ? '99+' : entry.unreadCount}
                </span>
              )}
            </span>
            {entry.lastMessageText && (
              <span className="mt-1 block truncate text-xs font-normal text-neutral-600">
                {entry.lastMessageText}
              </span>
            )}
            {entry.lastMessageAt && (
              <span className="mt-0.5 block text-xs font-normal text-neutral-500">
                {toLocalDateTime(entry.lastMessageAt)}
              </span>
            )}
          </button>
        ))}
      </aside>

      <section className="space-y-4 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm">
        <h1 className="font-['Space_Grotesk'] text-4xl leading-tight font-bold tracking-tight text-neutral-900">Private Nachrichten {selectedPeer ? `mit ${selectedPeer.username}` : ''}</h1>
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

        <div className="flex min-h-[360px] max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
          {messages.map((message) => {
            const senderName = message.sender?.username || message.senderUsername || 'User'
            return (
              <div key={message._id || message.id} className="rounded-xl border border-neutral-300 bg-white p-3">
                <strong className="text-neutral-900">{senderName}</strong>
                <p className="my-1 text-neutral-800">{message.text}</p>
                <span className="text-xs text-neutral-600">{toLocalDateTime(message.createdAt)}</span>
              </div>
            )
          })}
          {!messages.length && <p className="text-neutral-600">Noch keine Nachrichten.</p>}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={sendMessage} className="flex flex-wrap gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Nachricht eingeben"
            disabled={!selectedPeerId}
            className="min-w-[220px] flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button type="submit" disabled={!selectedPeerId} className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">Senden</button>
        </form>
      </section>
    </section>
  )
}

export default PrivateMessagesPage
