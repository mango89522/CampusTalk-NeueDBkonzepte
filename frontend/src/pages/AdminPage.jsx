import { useEffect, useState } from 'react'
import { adminApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'

function AdminPage() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    loadUsers()
  }, [])

  const changeRole = async (userId, role) => {
    try {
      await adminApi.changeRole(userId, role)
      await loadUsers()
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Rolle konnte nicht geaendert werden'))
    }
  }

  return (
    <section className="stack-lg">
      <header className="card stack-sm">
        <h1>Admin Dashboard</h1>
        <p>Nutzerverwaltung und Rollenvergabe.</p>
      </header>

      {error && <p className="error-text">{error}</p>}
      {isLoading && <p>Lade Nutzer...</p>}

      {!isLoading && (
        <div className="card stack-md">
          {users.map((user) => (
            <div key={user._id || user.id} className="user-row">
              <div>
                <strong>{user.username}</strong>
                <p className="muted">{user.email}</p>
              </div>
              <div className="inline-actions">
                <select
                  value={user.role}
                  onChange={(event) => changeRole(user._id || user.id, event.target.value)}
                >
                  <option value="Studierender">Studierender</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default AdminPage
