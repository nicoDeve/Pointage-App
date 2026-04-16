import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { Project, User } from '@repo/shared'
import { hasRole, SUPPORT_PAGE_ROLES, ABSENCE_MANAGEMENT_ROLES } from '@repo/shared'
import { api } from '~/lib/api'
import { notifyError } from '~/lib/notify'
import { useAuth } from '~/hooks/use-auth'

// Module-level cache: survives component remounts across route navigations.
// Same strategy as usePageData's pageCache — instant data on re-mount, silent refresh.
const appCache: {
  projects: Project[] | null
  allProjects: Project[] | null
  users: User[] | null
  pendingAbsenceCount: number | null
} = { projects: null, allProjects: null, users: null, pendingAbsenceCount: null }

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
  const [projects, setProjects] = useState<Project[]>(appCache.projects ?? [])
  const [allProjects, setAllProjects] = useState<Project[]>(appCache.allProjects ?? [])
  const [users, setUsers] = useState<User[]>(appCache.users ?? [])
  const [pendingAbsenceCount, setPendingAbsenceCount] = useState(appCache.pendingAbsenceCount ?? 0)
  const [loading, setLoading] = useState(!appCache.projects)

  const canListUsers = hasRole(currentUser?.roles ?? [], SUPPORT_PAGE_ROLES)

  const canManageAbsences = hasRole(currentUser?.roles ?? [], ABSENCE_MANAGEMENT_ROLES)

  // Use refs so reload/refreshPendingCount identities stay stable across renders
  const canListUsersRef = useRef(canListUsers)
  canListUsersRef.current = canListUsers
  const canManageAbsencesRef = useRef(canManageAbsences)
  canManageAbsencesRef.current = canManageAbsences

  const refreshPendingCount = useCallback(async () => {
    if (!canManageAbsencesRef.current) return
    try {
      const pending = await api.absenceRequests.list({ status: 'en_attente' })
      const count = Array.isArray(pending) ? pending.length : 0
      appCache.pendingAbsenceCount = count
      setPendingAbsenceCount(count)
    } catch { /* badge count is non-critical */ }
  }, [])

  const reload = useCallback(async () => {
    // Only show loading skeleton on first-ever load (no cache)
    if (!appCache.projects) setLoading(true)
    try {
      const [active, all, u] = await Promise.all([
        api.projects.list(true),
        api.projects.list(false),
        canListUsersRef.current ? api.users.list() : Promise.resolve([]),
      ])
      // Update module-level cache
      appCache.projects = active
      appCache.allProjects = all
      appCache.users = u
      setProjects(active)
      setAllProjects(all)
      setUsers(u)
      await refreshPendingCount()
    } catch {
      notifyError('Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }, [refreshPendingCount])

  // Load once on mount — silent refresh if cache already exists
  const hasLoaded = useRef(false)
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true
      reload()
    }
  }, [reload])

  return (
    <AppDataContext.Provider value={{
      projects, allProjects, users, pendingAbsenceCount,
      loading, reload, refreshPendingCount,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}
