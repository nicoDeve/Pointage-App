import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { User } from '@repo/shared'
import { AuthLayoutWrapper } from '~/components/layout/auth-layout-wrapper'
import { SupportPage } from '~/components/support/support-page'

const ALLOWED_ROLES = ['admin', 'support']

function SupportGuard({ user }: { user: User }) {
  const navigate = useNavigate()
  const hasAccess = user.roles.some((r: string) => ALLOWED_ROLES.includes(r))
  useEffect(() => {
    if (!hasAccess) navigate({ to: '/', replace: true })
  }, [hasAccess, navigate])
  if (!hasAccess) return null
  return <SupportPage user={user} />
}

export const Route = createFileRoute('/support')({
  component: () => (
    <AuthLayoutWrapper>{(user) => <SupportGuard user={user} />}</AuthLayoutWrapper>
  ),
})
