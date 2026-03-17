import { useEffect, useState } from 'react'
import { postApi, userApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import PostCard from '../components/PostCard'

function ProfilePage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMyPosts = async () => {
      try {
        const { data } = await userApi.myPosts()
        setPosts(data)
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, 'Profil konnte nicht geladen werden'))
      } finally {
        setIsLoading(false)
      }
    }

    loadMyPosts()
  }, [])

  const deletePost = async (postId) => {
    if (!window.confirm('Post wirklich loeschen?')) return

    try {
      await postApi.remove(postId)
      setPosts((prev) => prev.filter((post) => String(post._id) !== String(postId)))
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Post konnte nicht geloescht werden'))
    }
  }

  return (
    <section className="space-y-7">
      <header className="space-y-2 rounded-2xl border border-neutral-300 bg-[rgba(255,253,248,0.95)] p-6 shadow-sm">
        <h1 className="font-['Space_Grotesk'] text-4xl leading-tight font-bold tracking-tight text-neutral-900">Profil</h1>
        <p><strong>Username:</strong> <span className="text-neutral-700">{user?.username}</span></p>
        <p><strong>E-Mail:</strong> <span className="text-neutral-700">{user?.email}</span></p>
        <p><strong>Rolle:</strong> <span className="text-neutral-700">{user?.role}</span></p>
      </header>

      <section className="space-y-4">
        <h2 className="font-['Space_Grotesk'] text-3xl leading-tight font-bold tracking-tight text-neutral-900">Meine Posts</h2>
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        {isLoading && <p className="text-neutral-600">Lade Posts...</p>}
        {!isLoading && posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            canManage
            editPath={`/posts/${post._id}/edit`}
            onDelete={deletePost}
          />
        ))}
        {!isLoading && !posts.length && <p className="text-neutral-600">Du hast noch keine Posts erstellt.</p>}
      </section>
    </section>
  )
}

export default ProfilePage
