import { createFileRoute } from '@tanstack/react-router'
import { AuthLayoutWrapper } from '~/components/layout/auth-layout-wrapper'
import { PointagePage } from '~/components/timesheet/pointage-page'

export const Route = createFileRoute('/pointage')({
  component: () => (
    <AuthLayoutWrapper>{(user) => <PointagePage user={user} />}</AuthLayoutWrapper>
  ),
})
