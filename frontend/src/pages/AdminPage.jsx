import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, forumApi, postApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'

function AdminPage() {
  const [activeTab, setActiveTab] = useState('users')

  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [forums, setForums] = useState([])
  const [forumPosts, setForumPosts] = useState({})
  const [forumPostsLoading, setForumPostsLoading] = useState({})

  const [editingForumId, setEditingForumId] = useState('')
  const [forumForm, setForumForm] = useState({ title: '', description: '', tags: '' })

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingForums, setIsLoadingForums] = useState(true)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setError('')
      const { data } = await adminApi.users()
      setUsers(data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'User konnten nicht geladen werden'))
    } finally {
      setIsLoading(false)
    }
  }

  const loadForums = async () => {
    try {
      setIsLoadingForums(true)
      setError('')
      const { data } = await forumApi.list()
      setForums(data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Foren konnten nicht geladen werden'))
    } finally {
      setIsLoadingForums(false)
    }
  }

  const loadReports = async () => {
    try {
      setError('')
      const { data } = await adminApi.reports()
      setReports(data)
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Meldungen konnten nicht geladen werden'))
    }
  }

  useEffect(() => {
    loadUsers()
    loadForums()
    loadReports()
  }, [])

  const changeRole = async (userId, role) => {
    try {
      await adminApi.changeRole(userId, role)
      await loadUsers()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Rolle konnte nicht geändert werden'))
    }
  }

  const beginForumEdit = (forum) => {
    setEditingForumId(forum._id)
    setForumForm({
      title: forum.title || '',
      description: forum.description || '',
      tags: (forum.tags || []).join(', '),
    })
  }

  const cancelForumEdit = () => {
    setEditingForumId('')
    setForumForm({ title: '', description: '', tags: '' })
  }

  const saveForum = async (forumId) => {
    try {
      await forumApi.update(forumId, {
        title: forumForm.title,
        description: forumForm.description,
        tags: forumForm.tags,
      })
      await loadForums()
      cancelForumEdit()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Forum konnte nicht bearbeitet werden'))
    }
  }

  const deleteForum = async (forumId) => {
    if (!window.confirm('Forum wirklich löschen? Alle Posts in diesem Forum werden entfernt.')) return

    try {
      await forumApi.remove(forumId)
      setForums((prev) => prev.filter((forum) => String(forum._id) !== String(forumId)))
      setForumPosts((prev) => {
        const next = { ...prev }
        delete next[forumId]
        return next
      })
      if (String(editingForumId) === String(forumId)) {
        cancelForumEdit()
      }
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Forum konnte nicht gelöscht werden'))
    }
  }

  const loadPostsForForum = async (forumId) => {
    try {
      setForumPostsLoading((prev) => ({ ...prev, [forumId]: true }))
      const { data } = await postApi.list({ forumId })
      setForumPosts((prev) => ({ ...prev, [forumId]: data }))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Posts konnten nicht geladen werden'))
    } finally {
      setForumPostsLoading((prev) => ({ ...prev, [forumId]: false }))
    }
  }

  const toggleForumPosts = async (forumId) => {
    if (forumPosts[forumId]) {
      setForumPosts((prev) => {
        const next = { ...prev }
        delete next[forumId]
        return next
      })
      return
    }

    await loadPostsForForum(forumId)
  }

  const deletePost = async (forumId, postId) => {
    if (!window.confirm('Post wirklich löschen?')) return

    try {
      await postApi.remove(postId)
      setForumPosts((prev) => ({
        ...prev,
        [forumId]: (prev[forumId] || []).filter((post) => String(post._id) !== String(postId)),
      }))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht gelöscht werden'))
    }
  }

  return (
    <section className="space-y-7">
      <header className="space-y-2 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-6 shadow-sm">
        <h1 className="font-['Space_Grotesk'] text-4xl leading-tight font-bold tracking-tight text-neutral-900">Admin Dashboard</h1>
        <p className="text-neutral-700">Nutzerverwaltung, Forenverwaltung und Post-Moderation.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'users'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400'
          }`}
        >
          Nutzer verwalten
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('forums')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'forums'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400'
          }`}
        >
          Foren verwalten
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'reports'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400'
          }`}
        >
          Gemeldete Inhalte
        </button>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {activeTab === 'users' && isLoading && <p className="text-neutral-600">Lade Nutzer...</p>}
      {activeTab === 'forums' && isLoadingForums && <p className="text-neutral-600">Lade Foren...</p>}

      {activeTab === 'reports' && (
        <div className="space-y-3 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm">
          {!reports.length && <p className="text-neutral-600">Keine Meldungen vorhanden.</p>}
          {reports.map((entry) => (
            <article key={entry.id} className="space-y-1 rounded-xl border border-neutral-300 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">{entry.targetType === 'post' ? 'Post-Meldung' : 'Kommentar-Meldung'}</p>
              <p className="text-sm text-neutral-700">Gemeldet von {entry.reporter?.username || 'Unbekannt'} am {new Date(entry.createdAt).toLocaleString('de-DE')}</p>
              {entry.reason && <p className="text-sm text-neutral-800"><strong>Grund:</strong> {entry.reason}</p>}

              {entry.targetType === 'post' && entry.target && (
                <div className="rounded-lg border border-neutral-200 bg-[rgba(255,253,248,0.85)] p-3 text-sm text-neutral-800">
                  <p><strong>Titel:</strong> {entry.target.title}</p>
                  <p><strong>Forum:</strong> {entry.target.forum?.title || 'Unbekannt'}</p>
                  <p><strong>Autor:</strong> {entry.target.author?.username || 'Unbekannt'}</p>
                  <div className="mt-2">
                    <Link
                      to={`/posts/${entry.target._id}`}
                      className="inline-flex rounded-xl border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:-translate-y-0.5"
                    >
                      Zum Post
                    </Link>
                  </div>
                </div>
              )}

              {entry.targetType === 'comment' && entry.target && (
                <div className="rounded-lg border border-neutral-200 bg-[rgba(255,253,248,0.85)] p-3 text-sm text-neutral-800">
                  <p><strong>Post:</strong> {entry.target.post?.title || 'Unbekannt'}</p>
                  <p><strong>Autor:</strong> {entry.target.author?.username || 'Unbekannt'}</p>
                  <p className="mt-1"><strong>Kommentar:</strong> {entry.target.content}</p>
                  {entry.target.post?._id && (
                    <div className="mt-2">
                      <Link
                        to={`/posts/${entry.target.post._id}?commentId=${entry.target._id}`}
                        className="inline-flex rounded-xl border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:-translate-y-0.5"
                      >
                        Zum Kommentar
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {!entry.target && <p className="text-sm text-neutral-600">Zielinhalt wurde inzwischen gelöscht.</p>}
            </article>
          ))}
        </div>
      )}

      {activeTab === 'users' && !isLoading && (
        <div className="space-y-3 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm">
          {users.map((user) => (
            <div key={user._id || user.id} className="flex flex-col items-start justify-between gap-2 rounded-xl border border-neutral-300 bg-white p-3 md:flex-row md:items-center">
              <div>
                <strong className="text-neutral-900">{user.username}</strong>
                <p className="text-sm text-neutral-600">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={user.role}
                  onChange={(event) => changeRole(user._id || user.id, event.target.value)}
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="Studierender">Studierender</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'forums' && !isLoadingForums && (
        <div className="space-y-4 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-5 shadow-sm">
          {forums.map((forum) => {
            const posts = forumPosts[forum._id] || []
            const isEditing = String(editingForumId) === String(forum._id)
            const postsOpen = Boolean(forumPosts[forum._id])

            return (
              <article key={forum._id} className="space-y-3 rounded-xl border border-neutral-300 bg-white p-4">
                {!isEditing ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-['Space_Grotesk'] text-xl font-bold text-neutral-900">{forum.title}</h3>
                        <p className="text-sm text-neutral-700">{forum.description || 'Keine Beschreibung'}</p>
                        <p className="text-xs text-neutral-600">Erstellt von {forum.creator?.username || 'Unbekannt'}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(forum.tags || []).map((tag) => (
                            <span key={`${forum._id}-${tag}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">#{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => beginForumEdit(forum)} className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5">Bearbeiten</button>
                        <button type="button" onClick={() => deleteForum(forum._id)} className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5">Forum löschen</button>
                        <button type="button" onClick={() => toggleForumPosts(forum._id)} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-emerald-400">
                          {postsOpen ? 'Posts ausblenden' : 'Posts verwalten'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={forumForm.title}
                      onChange={(event) => setForumForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Forentitel"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                    <textarea
                      rows={3}
                      value={forumForm.description}
                      onChange={(event) => setForumForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Beschreibung"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                    <input
                      value={forumForm.tags}
                      onChange={(event) => setForumForm((prev) => ({ ...prev, tags: event.target.value }))}
                      placeholder="Tags, mit Komma getrennt"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => saveForum(forum._id)} className="rounded-xl border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5">Speichern</button>
                      <button type="button" onClick={cancelForumEdit} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-emerald-400">Abbrechen</button>
                    </div>
                  </div>
                )}

                {postsOpen && (
                  <section className="space-y-2 rounded-xl border border-neutral-200 bg-[rgba(255,253,248,0.85)] p-3">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-neutral-700">Posts in diesem Forum</h4>
                    {forumPostsLoading[forum._id] && <p className="text-sm text-neutral-600">Lade Posts...</p>}
                    {!forumPostsLoading[forum._id] && !posts.length && <p className="text-sm text-neutral-600">Keine Posts vorhanden.</p>}
                    {posts.map((post) => (
                      <div key={post._id} className="flex flex-col items-start justify-between gap-2 rounded-lg border border-neutral-300 bg-white p-3 md:flex-row md:items-center">
                        <div>
                          <p className="font-semibold text-neutral-900">{post.title}</p>
                          <p className="text-xs text-neutral-600">von {post.author?.username || 'Unbekannt'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/posts/${post._id}/edit`} className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5">Bearbeiten</Link>
                          <button type="button" onClick={() => deletePost(forum._id, post._id)} className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5">Löschen</button>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default AdminPage

