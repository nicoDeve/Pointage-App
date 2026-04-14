import type { User, Project, TimeEntry, AbsenceRequest } from '@repo/shared'

const BASE = typeof window !== 'undefined' ? window.location.origin : ''

/**
 * Pluggable access-token getter.
 * In production, set this to an MSAL `acquireTokenSilent` wrapper.
 * In dev (DEV_AUTH_BYPASS), leave as-is — the server resolves the user without a token.
 */
let accessTokenGetter: (() => Promise<string | null>) | null = null

export function setAccessTokenGetter(getter: () => Promise<string | null>) {
  accessTokenGetter = getter
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  }

  if (accessTokenGetter) {
    const token = await accessTokenGetter()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  const json = await res.json()
  return json.data !== undefined ? json.data : json
}

export const api = {
  users: {
    list: () => apiFetch<User[]>('/api/users'),
    get: (id: string) => apiFetch<User>(`/api/users/${id}`),
    update: (id: string, data: Partial<Pick<User, 'name' | 'poste' | 'roles' | 'imageUrl' | 'leaveQuota'>>) =>
      apiFetch<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  projects: {
    list: (activeOnly = true) =>
      apiFetch<Project[]>(`/api/projects${activeOnly ? '?isActive=true' : ''}`),
    create: (data: { name: string; color: string; isActive?: boolean; pole?: string }) =>
      apiFetch<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; color: string; isActive: boolean; pole: string | null }>) =>
      apiFetch<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<void>(`/api/projects/${id}`, { method: 'DELETE' }),
  },
  timeEntries: {
    list: (userId: string, startDate: string, endDate: string) =>
      apiFetch<TimeEntry[]>(`/api/time-entries?userId=${userId}&startDate=${startDate}&endDate=${endDate}`),
    weekSummary: (userId: string, weekStart: string) =>
      apiFetch<{ totalHours: number; distinctProjects: number; hasAbsenceOverlap: boolean }>(`/api/time-entries/week-summary?userId=${userId}&weekStart=${weekStart}`),
    create: (data: { projectId: string; workDate: string; duration: number; startTime?: string }) =>
      apiFetch<TimeEntry>('/api/time-entries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ projectId: string; workDate: string; duration: number; startTime: string }>) =>
      apiFetch<TimeEntry>(`/api/time-entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<void>(`/api/time-entries/${id}`, { method: 'DELETE' }),
  },
  absenceRequests: {
    list: (params?: { userId?: string; status?: string; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.userId) qs.set('userId', params.userId)
      if (params?.status) qs.set('status', params.status)
      if (params?.limit) qs.set('limit', String(params.limit))
      const q = qs.toString()
      return apiFetch<AbsenceRequest[]>(`/api/absence-requests${q ? `?${q}` : ''}`)
    },
    get: (id: string) => apiFetch<AbsenceRequest>(`/api/absence-requests/${id}`),
    create: (data: { type: string; startDate: string; endDate: string; halfDay?: boolean; comment?: string }) =>
      apiFetch<AbsenceRequest>('/api/absence-requests', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string) =>
      apiFetch<AbsenceRequest>(`/api/absence-requests/${id}/approve`, { method: 'PATCH' }),
    reject: (id: string, data: { rejectReasonCode: string; rejectComment?: string }) =>
      apiFetch<AbsenceRequest>(`/api/absence-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
}
