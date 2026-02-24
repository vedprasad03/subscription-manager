import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi, type User } from '../api/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authApi.me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login(email, password)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const me = await authApi.me()
    setUser(me)
  }

  const register = async (email: string, password: string) => {
    const tokens = await authApi.register(email, password)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const me = await authApi.me()
    setUser(me)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
