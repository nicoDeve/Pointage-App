import { createFileRoute } from '@tanstack/react-router'
import { GESTION_PAGE_ROLES } from '@repo/shared'
import { AuthLayoutWrapper } from '~/components/layout/auth-layout-wrapper'
import { RoleGuard } from '~/components/shared/role-guard'
import { GestionPage } from '~/components/gestion/gestion-page'

export const Route = createFileRoute('/gestion')({
  component: () => (
    <AuthLayoutWrapper>
      {(user) => (
        <RoleGuard user={user} roles={GESTION_PAGE_ROLES}>
          <GestionPage user={user} />
        </RoleGuard>
      )}
    </AuthLayoutWrapper>
  ),
})
