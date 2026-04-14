import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@repo/shared'
import { apiFetch } from '~/lib/api'

export type RefetchAuthOptions = { soft?: boolean }

type AuthContextValue = {
  user: User | null
  loading: boolean
  logout: () => void
  refetch: (options?: RefetchAuthOptions) => Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCurrentUser = useCallback(
    async (options?: RefetchAuthOptions): Promise<User | null> => {
      const soft = options?.soft === true
      if (!soft) setLoading(true)
      try {
        const u = await apiFetch<User>('/api/auth/me')
        setUser(u)
        return u
      } catch {
        setUser(null)
        return null
      } finally {
        if (!soft) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void fetchCurrentUser()
  }, [fetchCurrentUser])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      logout,
      refetch: fetchCurrentUser,
    }),
    [user, loading, logout, fetchCurrentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return ctx
}
