import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { forumApi, postApi, userApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import PostCard from '../components/PostCard'
import { useAuth } from '../hooks/useAuth'

function HomePage() {
  const { isLoggedIn, isAdmin, user } = useAuth()
  const [forums, setForums] = useState([])
  const [posts, setPosts] = useState([])
  const [subscribedForums, setSubscribedForums] = useState([])
  const [subscribedPosts, setSubscribedPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedTag, setAppliedTag] = useState('')
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const query = {}
      if (appliedSearch.trim()) query.search = appliedSearch.trim()

      const [forumsRes, postsRes] = await Promise.all([
        forumApi.list(query),
        postApi.list(query),
      ])

      setForums(forumsRes.data)
      setPosts(postsRes.data)

      if (isLoggedIn) {
        const { data: subscriptionsData } = await userApi.mySubscriptions()
        setSubscribedForums(subscriptionsData)

        if (subscriptionsData.length > 0) {
          const forumIds = subscriptionsData.map((entry) => entry._id || entry.id).join(',')
          const { data: subscribedPostsData } = await postApi.list({ forumIds })
          setSubscribedPosts(subscribedPostsData)
        } else {
          setSubscribedPosts([])
        }
      } else {
        setSubscribedForums([])
        setSubscribedPosts([])
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Inhalte konnten nicht geladen werden'))
    } finally {
      setIsLoading(false)
    }
  }, [appliedSearch, isLoggedIn])

  useEffect(() => {
    loadData()
  }, [loadData])

  const normalizedTag = appliedTag.trim().toLowerCase()

  const allTags = useMemo(() => {
    const tagSet = new Set()

    forums.forEach((forum) => {
      ;(forum.tags || []).forEach((forumTag) => tagSet.add(forumTag))
    })

    posts.forEach((post) => {
      ;(post.tags || []).forEach((postTag) => tagSet.add(postTag))
    })

    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'de'))
  }, [forums, posts])

  const tagSuggestions = useMemo(() => {
    if (!normalizedTag) return allTags.slice(0, 8)

    return allTags
      .filter((entry) => entry.toLowerCase().includes(normalizedTag))
      .slice(0, 8)
  }, [allTags, normalizedTag])

  const filteredForums = useMemo(() => {
    if (!normalizedTag) return forums

    return forums.filter((forum) =>
      (forum.tags || []).some((forumTag) => forumTag.toLowerCase().includes(normalizedTag))
    )
  }, [forums, normalizedTag])

  const filteredPosts = useMemo(() => {
    if (!normalizedTag) return posts

    return posts.filter((post) =>
      (post.tags || []).some((postTag) => postTag.toLowerCase().includes(normalizedTag))
    )
  }, [posts, normalizedTag])

  const activeForums = useMemo(() => {
    const latestPostByForum = new Map()
    const hasActiveFilter = Boolean(appliedSearch.trim() || normalizedTag)

    filteredPosts.forEach((post) => {
      const forumId = post.forum?._id || post.forum
      if (!forumId) return

      const createdAtMs = new Date(post.createdAt || 0).getTime()
      const previous = latestPostByForum.get(String(forumId))

      if (!previous || createdAtMs > previous.createdAtMs) {
        latestPostByForum.set(String(forumId), { createdAtMs, post })
      }
    })

    return filteredForums
      .map((forum) => ({
        forum,
        lastPostAt: latestPostByForum.get(String(forum._id))?.createdAtMs || 0,
      }))
      .sort((a, b) => b.lastPostAt - a.lastPostAt)
      .slice(0, hasActiveFilter ? filteredForums.length : 5)
      .map((entry) => entry.forum)
  }, [filteredForums, filteredPosts, appliedSearch, normalizedTag])

  const newestPosts = useMemo(() => {
    return [...filteredPosts]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5)
  }, [filteredPosts])

  const newestSubscribedPosts = useMemo(() => {
    const forumIdSet = new Set(subscribedForums.map((entry) => String(entry._id || entry.id)))

    return [...subscribedPosts]
      .filter((post) => forumIdSet.has(String(post.forum?._id || post.forum)))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5)
  }, [subscribedPosts, subscribedForums])

  const vote = async (postId, type) => {
    try {
      if (type === 'up') {
        await postApi.upvote(postId)
      } else {
        await postApi.downvote(postId)
      }
      await loadData()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Bewertung fehlgeschlagen'))
    }
  }

  const canManagePost = useCallback((post) => {
    if (isAdmin) return true
    const currentUserId = user?.id || user?._id
    const authorId = post?.author?._id || post?.author
    return Boolean(currentUserId && authorId && String(currentUserId) === String(authorId))
  }, [isAdmin, user])

  const deletePost = async (postId) => {
    if (!window.confirm('Post wirklich löschen?')) return

    try {
      await postApi.remove(postId)
      setPosts((prev) => prev.filter((post) => String(post._id) !== String(postId)))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht gelöscht werden'))
    }
  }

  const reportPost = async (post) => {
    const reason = window.prompt('Warum möchtest du diesen Post melden? (optional)') || ''

    try {
      await postApi.report(post._id, reason)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht gemeldet werden'))
    }
  }

  const onFilterSubmit = async (event) => {
    event.preventDefault()
    setAppliedSearch(search.trim())
    setAppliedTag(tag.trim())
    setIsTagMenuOpen(false)
  }

  const selectTag = (selectedTag) => {
    setTag(selectedTag)
    setIsTagMenuOpen(false)
  }

  const clearTag = () => {
    setTag('')
    setAppliedTag('')
    setIsTagMenuOpen(false)
  }

  return (
    <section className="space-y-7">
      <div className="rounded-2xl border border-emerald-200 bg-[radial-gradient(circle_at_top_right,rgba(10,127,102,0.10),transparent_52%),rgba(255,253,248,0.95)] p-6 shadow-sm md:p-8">
        <h1 className="font-['Space_Grotesk'] text-4xl leading-tight font-bold tracking-tight text-neutral-900 md:text-5xl">CampusTalk</h1>
        <p className="mt-3 max-w-3xl text-neutral-700">
          Diskutiere Module, Prüfungen und Campus-Themen in Foren und chatte live mit anderen Studierenden.
        </p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-start" onSubmit={onFilterSubmit}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Suche in Titel und Inhalt"
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <div className="relative">
          <input
            value={tag}
            onChange={(event) => {
              setTag(event.target.value)
              setIsTagMenuOpen(true)
            }}
            onFocus={() => setIsTagMenuOpen(true)}
            onBlur={() => setTimeout(() => setIsTagMenuOpen(false), 120)}
            placeholder="Tag oder Modul (z.B. Datenbanken)"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          {isTagMenuOpen && tagSuggestions.length > 0 && (
            <div className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-30 flex max-h-56 flex-col overflow-y-auto rounded-xl border border-neutral-300 bg-white shadow-lg" role="listbox" aria-label="Tag Vorschläge">
              {tagSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="flex justify-start border-b border-neutral-200 bg-white px-3.5 py-3 text-sm font-medium text-neutral-700 transition last:border-b-0 hover:bg-emerald-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectTag(suggestion)}
                >
                  #{suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <button type="submit" className="rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5">Filtern</button>
          {tag && (
            <button type="button" onClick={clearTag} className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-emerald-400">Tag löschen</button>
          )}
        </div>
      </form>

      {appliedTag && <p className="text-sm text-neutral-600">Aktiver Tag-Filter: #{appliedTag}</p>}

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {isLoading && <p className="text-neutral-600">Lade Inhalte...</p>}

      {!isLoading && (
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.24fr)_minmax(0,1fr)] lg:items-start">
          <section className="space-y-4">
            <h2 className="font-['Space_Grotesk'] text-3xl leading-tight font-bold tracking-tight text-neutral-900">Aktive Foren</h2>
            {activeForums.map((forum) => (
              <article key={forum._id} className="rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Link to={`/forums/${forum._id}`} className="font-['Space_Grotesk'] text-lg font-bold text-neutral-900 hover:text-emerald-800">{forum.title}</Link>
                <p className="mt-2 text-neutral-700">{forum.description || 'Keine Beschreibung vorhanden.'}</p>
                <p className="mt-2 text-sm text-neutral-600">Erstellt von {forum.creator?.username || 'Unbekannt'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(forum.tags || []).map((forumTag) => (
                    <button
                      key={`${forum._id}-${forumTag}`}
                      type="button"
                      className="cursor-pointer rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:border-emerald-400 hover:bg-emerald-50"
                      onClick={() => selectTag(forumTag)}
                    >
                      #{forumTag}
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {!activeForums.length && <p className="text-neutral-600">Keine aktiven Foren gefunden.</p>}
          </section>

          <section className="space-y-4">
            <h2 className="font-['Space_Grotesk'] text-3xl leading-tight font-bold tracking-tight text-neutral-900">Neueste Posts</h2>
            {newestPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUserId={user?.id || user?._id}
                canVote={isLoggedIn}
                onUpvote={(id) => vote(id, 'up')}
                onDownvote={(id) => vote(id, 'down')}
                canManage={canManagePost(post)}
                editPath={`/posts/${post._id}/edit`}
                onDelete={deletePost}
                onReport={isLoggedIn && !canManagePost(post) ? reportPost : undefined}
                compact
              />
            ))}
            {!newestPosts.length && <p className="text-neutral-600">Keine Posts gefunden.</p>}
          </section>
        </div>
      )}

      {!isLoading && isLoggedIn && (
        <section className="space-y-4 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm">
          <h2 className="font-['Space_Grotesk'] text-3xl leading-tight font-bold tracking-tight text-neutral-900">Aus deinen abonnierten Foren</h2>
          {!newestSubscribedPosts.length && <p className="text-neutral-600">Keine neuen Posts in deinen Abos.</p>}
          {newestSubscribedPosts.map((post) => (
            <PostCard
              key={`sub-${post._id}`}
              post={post}
              currentUserId={user?.id || user?._id}
              canVote={isLoggedIn}
              onUpvote={(postId) => vote(postId, 'up')}
              onDownvote={(postId) => vote(postId, 'down')}
              canManage={canManagePost(post)}
              editPath={`/posts/${post._id}/edit`}
              onDelete={deletePost}
              onReport={isLoggedIn && !canManagePost(post) ? reportPost : undefined}
              compact
            />
          ))}
        </section>
      )}
    </section>
  )
}

export default HomePage
