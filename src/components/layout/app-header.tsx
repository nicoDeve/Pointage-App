import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Moon, Sun, LogOut, PanelLeft, PanelLeftClose, CalendarDays } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import type { User } from '@repo/shared'
import { useTheme } from '~/lib/theme'
import { getUserInitials } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { ActivityLogPopover } from '~/components/shared/activity-log-popover'

interface AppHeaderProps {
  user: User | null
  onLogout: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

type BreadcrumbEntry = { label: string; href?: string }

const BREADCRUMB_MAP: Record<string, BreadcrumbEntry[]> = {
  '/':        [{ label: 'Plateforme', href: '/' }, { label: 'Tableau de bord' }],
  '/pointage':[{ label: 'Feuille de temps' }, { label: 'Pointage' }],
  '/absences':[{ label: 'Feuille de temps' }, { label: 'Absences' }],
  '/gestion': [{ label: 'Administration' }, { label: 'Gestion' }],
  '/support': [{ label: 'Administration' }, { label: 'Support' }],
}

export function AppHeader({ user, onLogout, sidebarCollapsed, onToggleSidebar }: AppHeaderProps) {
  const { toggleTheme, isDark } = useTheme()
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })
  const displayDate = today.charAt(0).toUpperCase() + today.slice(1)

  const { location } = useRouterState()
  const crumbs = BREADCRUMB_MAP[location.pathname] ?? [{ label: 'Holis' }, { label: location.pathname.replace('/', '') }]
  const displayName = user?.name ?? user?.poste ?? 'Utilisateur'

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background shrink-0 gap-3">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-8 w-8 shrink-0"
          title={sidebarCollapsed ? 'Développer la sidebar' : 'Réduire la sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>

        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-1.5">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {i < crumbs.length - 1 ? (
                    <BreadcrumbLink
                      href={crumb.href ?? '#'}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-xs font-medium text-foreground">
                      {crumb.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: date + activity + theme + avatar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{displayDate}</span>
        </div>

        <ActivityLogPopover />

        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
          title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.imageUrl ?? undefined} />
                <AvatarFallback className="text-xs bg-linear-to-br from-pink-400 to-purple-500 text-white">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.poste ?? 'Collaborateur'}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {isDark ? <Sun className="size-4 mr-2" /> : <Moon className="size-4 mr-2" />}
              {isDark ? 'Mode clair' : 'Mode sombre'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
              <LogOut className="size-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
