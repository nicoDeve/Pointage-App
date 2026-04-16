import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '~/hooks/use-auth'
import { AppDataProvider } from '~/contexts/app-data-provider'
import { AppLayout } from './app-layout'

interface AuthLayoutWrapperProps {
  children: (user: NonNullable<ReturnType<typeof useAuth>['user']>) => React.ReactNode
}

export function AuthLayoutWrapper({ children }: AuthLayoutWrapperProps) {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login', replace: true })
    }
  }, [loading, user, navigate])

  if (loading) {
    return (
      <div className="flex h-screen min-h-0 items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen min-h-0 items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Redirection…</p>
      </div>
    )
  }

  return (
    <AppDataProvider>
      <AppLayout user={user} onLogout={logout}>
        {children(user)}
      </AppLayout>
    </AppDataProvider>
  )
}
