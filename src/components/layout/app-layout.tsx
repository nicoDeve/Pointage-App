import { useState } from 'react'
import type { User } from '@repo/shared'
import { AppSidebar } from './app-sidebar'
import { AppHeader } from './app-header'
import { usePendingAbsenceCount } from '~/hooks/use-app-data'

interface AppLayoutProps {
  user: User | null
  onLogout: () => void
  children: React.ReactNode
}

export function AppLayout({ user, onLogout, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pendingCount = usePendingAbsenceCount()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        pendingCount={pendingCount}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader
          user={user}
          onLogout={onLogout}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <main className="flex flex-col flex-1 min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
