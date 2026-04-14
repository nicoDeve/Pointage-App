import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { User } from '@repo/shared'
import { AuthLayoutWrapper } from '~/components/layout/auth-layout-wrapper'
import { GestionPage } from '~/components/gestion/gestion-page'

const ALLOWED_ROLES = ['admin', 'validateur', 'support']

function GestionGuard({ user }: { user: User }) {
  const navigate = useNavigate()
  const hasAccess = user.roles.some((r: string) => ALLOWED_ROLES.includes(r))
  useEffect(() => {
    if (!hasAccess) navigate({ to: '/', replace: true })
  }, [hasAccess, navigate])
  if (!hasAccess) return null
  return <GestionPage user={user} />
}

export const Route = createFileRoute('/gestion')({
  component: () => (
    <AuthLayoutWrapper>{(user) => <GestionGuard user={user} />}</AuthLayoutWrapper>
  ),
})
