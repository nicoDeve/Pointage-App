import { useContext } from 'react'
import { AppDataContext } from '~/contexts/app-data-provider'

function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}

export function useProjects() {
  return useAppData().projects
}

export function useAllProjects() {
  return useAppData().allProjects
}

export function useUsers() {
  return useAppData().users
}

export function usePendingAbsenceCount() {
  return useAppData().pendingAbsenceCount
}

export function useRefreshPendingCount() {
  return useAppData().refreshPendingCount
}
