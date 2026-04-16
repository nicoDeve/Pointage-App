import { useState } from 'react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Clock,
  CalendarOff,
  ShieldCheck,
  HeadsetIcon,
  ChevronDown,
} from 'lucide-react'
import type { User } from '@repo/shared'
import { hasRole, ABSENCE_MANAGEMENT_ROLES, SUPPORT_PAGE_ROLES } from '@repo/shared'
import { cn } from '~/lib/utils'


interface AppSidebarProps {
  user: User | null
  collapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ user, collapsed, onToggle }: AppSidebarProps) {
  const matchRoute = useMatchRoute()
  const userRoles = user?.roles ?? []
  const [timesheetOpen, setTimesheetOpen] = useState(true)
  const [adminOpen, setAdminOpen] = useState(true)

  const isActive = (to: string) => !!matchRoute({ to, fuzzy: false })
  const timesheetActive = isActive('/pointage') || isActive('/absences')
  const adminActive = isActive('/gestion') || isActive('/support')

  const showAdmin = hasRole(userRoles, ABSENCE_MANAGEMENT_ROLES)
  const showSupport = hasRole(userRoles, SUPPORT_PAGE_ROLES)

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 shrink-0',
        collapsed ? 'w-0 overflow-hidden' : 'w-56',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-sidebar-border min-h-14">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold">
          H
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="font-semibold truncate">Holis pointage</span>
            <span className="text-xs text-sidebar-foreground/50">Intranet</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-2 px-2 space-y-4">
        {/* Plateforme */}
        <div>
          {!collapsed && (
            <div className="app-sidebar-section-label">Plateforme</div>
          )}
          <div className="space-y-0.5">
            <Link
              to="/"
              className={cn(
                isActive('/') ? 'app-sidebar-item-active' : 'app-sidebar-item',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? 'Tableau de bord' : undefined}
            >
              <LayoutDashboard className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">Tableau de bord</span>}
            </Link>
          </div>
        </div>

        {/* Feuille de temps — groupe collapsible */}
        <div>
          {!collapsed && (
            <div className="app-sidebar-section-label">Feuille de temps</div>
          )}
          {!collapsed ? (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setTimesheetOpen((o) => !o)}
                className={cn(
                  'app-sidebar-item w-full justify-between',
                  timesheetActive && 'text-sidebar-foreground',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Clock className="size-4 shrink-0" />
                  <span className="truncate">Temps &amp; absences</span>
                </span>
                <ChevronDown
                  className={cn(
                    'size-3.5 text-sidebar-foreground/40 transition-transform duration-200',
                    timesheetOpen && 'rotate-180',
                  )}
                />
              </button>
              {timesheetOpen && (
                <div className="space-y-0.5 ml-7 mt-1">
                  <Link
                    to="/pointage"
                    className={cn(
                      isActive('/pointage') ? 'app-sidebar-item-active' : 'app-sidebar-item',
                    )}
                  >
                    <Clock className="size-3.5 shrink-0" />
                    <span className="truncate">Pointage</span>
                  </Link>
                  <Link
                    to="/absences"
                    className={cn(
                      isActive('/absences') ? 'app-sidebar-item-active' : 'app-sidebar-item',
                    )}
                  >
                    <CalendarOff className="size-3.5 shrink-0" />
                    <span className="truncate">Absences</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              <Link to="/pointage" className="app-sidebar-item justify-center px-0" title="Pointage">
                <Clock className="size-4 shrink-0" />
              </Link>
              <Link to="/absences" className="app-sidebar-item justify-center px-0" title="Absences">
                <CalendarOff className="size-4 shrink-0" />
              </Link>
            </div>
          )}
        </div>

        {/* Administration — accordion collapsible */}
        {(showAdmin || showSupport) && (
          <div>
            {!collapsed && (
              <div className="app-sidebar-section-label">Administration</div>
            )}
            {!collapsed ? (
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setAdminOpen((o) => !o)}
                  className={cn(
                    'app-sidebar-item w-full justify-between',
                    adminActive && 'text-sidebar-foreground',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 shrink-0" />
                    <span className="truncate">Gestion &amp; support</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-3.5 text-sidebar-foreground/40 transition-transform duration-200',
                      adminOpen && 'rotate-180',
                    )}
                  />
                </button>
                {adminOpen && (
                  <div className="space-y-0.5 ml-7 mt-1">
                    {showAdmin && (
                      <Link
                        to="/gestion"
                        className={cn(
                          isActive('/gestion') ? 'app-sidebar-item-active' : 'app-sidebar-item',
                        )}
                      >
                        <ShieldCheck className="size-3.5 shrink-0" />
                        <span className="truncate">Gestion</span>
                      </Link>
                    )}
                    {showSupport && (
                      <Link
                        to="/support"
                        className={cn(
                          isActive('/support') ? 'app-sidebar-item-active' : 'app-sidebar-item',
                        )}
                      >
                        <HeadsetIcon className="size-3.5 shrink-0" />
                        <span className="truncate">Support</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                {showAdmin && (
                  <Link to="/gestion" className="app-sidebar-item justify-center px-0" title="Gestion">
                    <ShieldCheck className="size-4 shrink-0" />
                  </Link>
                )}
                {showSupport && (
                  <Link to="/support" className="app-sidebar-item justify-center px-0" title="Support">
                    <HeadsetIcon className="size-4 shrink-0" />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  )
}
