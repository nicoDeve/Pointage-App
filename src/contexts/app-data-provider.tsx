import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Project, User } from '@repo/shared'
import { api } from '~/lib/api'
import { notifyError } from '~/lib/notify'
import { useAuth } from '~/hooks/use-auth'

export interface AppDataContextValue {
  projects: Project[]
  allProjects: Project[]
  users: User[]
  pendingAbsenceCount: number
  loading: boolean
  reload: () => void
  refreshPendingCount: () => Promise<void>
}

export const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user: currentUser } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [pendingAbsenceCount, setPendingAbsenceCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const canListUsers = currentUser?.roles.some((r: string) =>
    ['admin', 'support'].includes(r),
  ) ?? false

  const canManageAbsences = currentUser?.roles.some((r: string) =>
    ['admin', 'validateur'].includes(r),
  ) ?? false

  const refreshPendingCount = useCallback(async () => {
    if (!canManageAbsences) return
    try {
      const pending = await api.absenceRequests.list({ status: 'en_attente' })
      setPendingAbsenceCount(Array.isArray(pending) ? pending.length : 0)
    } catch { /* badge count is non-critical */ }
  }, [canManageAbsences])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [active, all, u] = await Promise.all([
        api.projects.list(true),
        api.projects.list(false),
        canListUsers ? api.users.list() : Promise.resolve([]),
      ])
      setProjects(active)
      setAllProjects(all)
      setUsers(u)
      await refreshPendingCount()
    } catch {
      notifyError('Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }, [canListUsers, refreshPendingCount])

  useEffect(() => { reload() }, [reload])

  return (
    <AppDataContext.Provider value={{
      projects, allProjects, users, pendingAbsenceCount,
      loading, reload, refreshPendingCount,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}
