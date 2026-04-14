import { createFileRoute } from '@tanstack/react-router'
import { AuthLayoutWrapper } from '~/components/layout/auth-layout-wrapper'
import { DashboardPage } from '~/components/dashboard/dashboard-page'

export const Route = createFileRoute('/')({
  component: () => (
    <AuthLayoutWrapper>{(user) => <DashboardPage user={user} />}</AuthLayoutWrapper>
  ),
})
