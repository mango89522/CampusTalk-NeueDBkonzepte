import { useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/services'
import { getApiErrorMessage } from '../api/client'
import { AuthContext } from './auth-context'

const TOKEN_KEY = 'campustalk_token'
const USER_KEY = 'campustalk_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [isAuthReady, setIsAuthReady] = useState(false)

  const isLoggedIn = Boolean(token && user)
  const isAdmin = user?.role === 'Administrator'

  useEffect(() => {
    let isMounted = true

    const hydrate = async () => {
      if (!token) {
        setIsAuthReady(true)
        return
      }

      try {
        const { data } = await authApi.me()
        if (!isMounted) return
        setUser(data)
        localStorage.setItem(USER_KEY, JSON.stringify(data))
      } catch {
        if (!isMounted) return
        setToken('')
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } finally {
        if (isMounted) setIsAuthReady(true)
      }
    }

    hydrate()

    return () => {
      isMounted = false
    }
  }, [token])

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data
  }

  const register = async (username, email, password) => {
    try {
      const { data } = await authApi.register({ username, email, password })
      return data
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Registrierung fehlgeschlagen'))
    }
  }

  const logout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const value = useMemo(() => ({
    token,
    user,
    isLoggedIn,
    isAdmin,
    isAuthReady,
    login,
    register,
    logout,
  }), [token, user, isLoggedIn, isAdmin, isAuthReady])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
