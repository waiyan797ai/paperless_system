import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import {
  clearAuth,
  getDashboardPath,
  getStoredUser,
  getToken,
  normalizeUser,
  setStoredUser,
  setToken,
} from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [loading, setLoading] = useState(!!getToken())

  const isAuthenticated = useMemo(() => !!getToken() && !!user, [user])

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }

    api
      .get('/auth/profile')
      .then(({ data }) => {
        const normalized = normalizeUser(data.user)
        setStoredUser(normalized)
        setUser(normalized)
      })
      .catch(() => {
        clearAuth()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setToken(data.token)
      const normalized = normalizeUser(data.user)
      setStoredUser(normalized)
      setUser(normalized)
      return { user: normalized, redirectTo: getDashboardPath(normalized.role) }
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid email or password'
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout').catch(() => {})
    } finally {
      clearAuth()
      setUser(null)
    }
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = normalizeUser({ ...prev, ...updates })
      setStoredUser(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAuthenticated, login, logout, updateUser }),
    [user, loading, isAuthenticated, login, logout, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
