import { createFileRoute } from '@tanstack/react-router'
import { SUPPORT_PAGE_ROLES } from '@repo/shared'
import { AuthLayoutWrapper } from '~/components/layout/auth-layout-wrapper'
import { RoleGuard } from '~/components/shared/role-guard'
import { SupportPage } from '~/components/support/support-page'

export const Route = createFileRoute('/support')({
  component: () => (
    <AuthLayoutWrapper>
      {(user) => (
        <RoleGuard user={user} roles={SUPPORT_PAGE_ROLES}>
          <SupportPage user={user} />
        </RoleGuard>
      )}
    </AuthLayoutWrapper>
  ),
})
