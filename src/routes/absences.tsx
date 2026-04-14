import { createFileRoute } from '@tanstack/react-router'
import { AuthLayoutWrapper } from '~/components/layout/auth-layout-wrapper'
import { AbsencesPage } from '~/components/absences/absences-page'

export const Route = createFileRoute('/absences')({
  component: () => (
    <AuthLayoutWrapper>{(user) => <AbsencesPage user={user} />}</AuthLayoutWrapper>
  ),
})
