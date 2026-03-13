import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { forumApi, postApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import PostCard from '../components/PostCard'
import { useAuth } from '../hooks/useAuth'

function HomePage() {
  const { isLoggedIn } = useAuth()
  const [forums, setForums] = useState([])
  const [posts, setPosts] = useState([])
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
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Inhalte konnten nicht geladen werden'))
    } finally {
      setIsLoading(false)
    }
  }, [appliedSearch])

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
    <section className="stack-lg">
      <div className="hero card">
        <h1>CampusTalk</h1>
        <p>
          Diskutiere Module, Pruefungen und Campus-Themen in Foren und chatte live mit anderen Studierenden.
        </p>
      </div>

      <form className="card filter-grid" onSubmit={onFilterSubmit}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Suche in Titel und Inhalt"
        />
        <div className="tag-autocomplete">
          <input
            value={tag}
            onChange={(event) => {
              setTag(event.target.value)
              setIsTagMenuOpen(true)
            }}
            onFocus={() => setIsTagMenuOpen(true)}
            onBlur={() => setTimeout(() => setIsTagMenuOpen(false), 120)}
            placeholder="Tag oder Modul (z.B. Datenbanken)"
          />

          {isTagMenuOpen && tagSuggestions.length > 0 && (
            <div className="tag-suggestions" role="listbox" aria-label="Tag Vorschlaege">
              {tagSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="tag-suggestion-btn"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectTag(suggestion)}
                >
                  #{suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="inline-actions">
          <button type="submit">Filtern</button>
          {tag && (
            <button type="button" onClick={clearTag}>Tag loeschen</button>
          )}
        </div>
      </form>

      {appliedTag && <p className="muted">Aktiver Tag-Filter: #{appliedTag}</p>}

      {error && <p className="error-text">{error}</p>}
      {isLoading && <p>Lade Inhalte...</p>}

      {!isLoading && (
        <div className="grid-two">
          <section className="stack-md">
            <h2>Foren</h2>
            {filteredForums.map((forum) => (
              <article key={forum._id} className="card forum-card">
                <Link to={`/forums/${forum._id}`} className="forum-title">{forum.title}</Link>
                <p>{forum.description || 'Keine Beschreibung vorhanden.'}</p>
                <p className="muted">Erstellt von {forum.creator?.username || 'Unbekannt'}</p>
                <div className="chip-row">
                  {(forum.tags || []).map((forumTag) => (
                    <button
                      key={`${forum._id}-${forumTag}`}
                      type="button"
                      className="chip chip-btn"
                      onClick={() => selectTag(forumTag)}
                    >
                      #{forumTag}
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {!filteredForums.length && <p className="muted">Keine Foren gefunden.</p>}
          </section>

          <section className="stack-md">
            <h2>Aktuelle Posts</h2>
            {filteredPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                canVote={isLoggedIn}
                onUpvote={(id) => vote(id, 'up')}
                onDownvote={(id) => vote(id, 'down')}
                compact
              />
            ))}
            {!filteredPosts.length && <p className="muted">Keine Posts gefunden.</p>}
          </section>
        </div>
      )}
    </section>
  )
}

export default HomePage
