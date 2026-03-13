import { useEffect, useState } from 'react'
import { userApi } from '../api/services'
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

  return (
    <section className="stack-lg">
      <header className="card stack-sm">
        <h1>Profil</h1>
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>E-Mail:</strong> {user?.email}</p>
        <p><strong>Rolle:</strong> {user?.role}</p>
      </header>

      <section className="stack-md">
        <h2>Meine Posts</h2>
        {error && <p className="error-text">{error}</p>}
        {isLoading && <p>Lade Posts...</p>}
        {!isLoading && posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
        {!isLoading && !posts.length && <p className="muted">Du hast noch keine Posts erstellt.</p>}
      </section>
    </section>
  )
}

export default ProfilePage
