import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { User, UserRole } from '@repo/shared'
import { hasRole } from '@repo/shared'

interface RoleGuardProps {
  user: User
  roles: readonly UserRole[]
  children: React.ReactNode
}

export function RoleGuard({ user, roles, children }: RoleGuardProps) {
  const navigate = useNavigate()
  const hasAccess = hasRole(user.roles, roles)

  useEffect(() => {
    if (!hasAccess) navigate({ to: '/', replace: true })
  }, [hasAccess, navigate])

  if (!hasAccess) return null
  return <>{children}</>
}
