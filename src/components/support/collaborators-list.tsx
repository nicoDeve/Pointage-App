import type { User, TimeEntry, Project } from '@repo/shared'
import { HOURS_PER_WORKDAY, sumHours, parseDuration, monthTargetHours } from '@repo/shared'
import { cn, getUserName, getUserInitials, formatHoursLabel } from '~/lib/utils'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { CompletionStatusBadge, getCompletionStatus } from '~/components/shared/app-badges'
import { Badge } from '~/components/ui/badge'
import { Progress } from '~/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '~/components/ui/context-menu'
import { ChevronRight, Download, MoreHorizontal } from 'lucide-react'

interface CollaboratorsListProps {
  users: User[]
  entries: TimeEntry[]
  projects: Project[]
  month: Date
  onSelectUser?: (userId: string, tab: 'weekly' | 'profile') => void
  onExportUserCsv?: (userId: string) => void
}

export function CollaboratorsList({
  users,
  entries,
  projects,
  month,
  onSelectUser,
  onExportUserCsv,
}: CollaboratorsListProps) {
  const monthTarget = monthTargetHours(month.getFullYear(), month.getMonth())
  const projectMap = new Map(projects.map((p) => [p.id, p]))

  if (users.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Aucun collaborateur trouvé.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_110px_100px_32px_32px] items-center border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Collaborateur</span>
        <span className="text-center">Projets</span>
        <span className="text-center">Heures</span>
        <span className="text-center">Statut</span>
        <span />
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {users.map((usr) => {
          const userEntries = entries.filter((e) => e.userId === usr.id)
          const totalH = sumHours(userEntries)
          const pct = monthTarget > 0 ? Math.min(100, Math.round((totalH / monthTarget) * 100)) : 0
          const isComplete = totalH >= monthTarget

          const byProject = new Map<string, number>()
          for (const e of userEntries) {
            byProject.set(e.projectId, (byProject.get(e.projectId) ?? 0) + parseDuration(e.duration))
          }
          const projectIds = [...byProject.keys()]

          const sc = getCompletionStatus(totalH, monthTarget)

          return (
            <ContextMenu key={usr.id}>
              <ContextMenuTrigger asChild>
                <div
                  className="grid cursor-pointer grid-cols-[1fr_80px_110px_100px_32px_32px] items-center px-3 py-2.5 transition-colors hover:bg-muted/30 group"
                  onClick={() => onSelectUser?.(usr.id, 'profile')}
                >
                  {/* Identity */}
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                        {getUserInitials(usr)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{getUserName(usr)}</p>
                      {usr.poste && <p className="truncate text-xs text-muted-foreground">{usr.poste}</p>}
                    </div>
                  </div>

                  {/* Projects */}
                  <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1 text-xs font-normal">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                          {projectIds.length}
                        </Badge>
                      </TooltipTrigger>
                      {projectIds.length > 0 && (
                        <TooltipContent side="bottom" className="max-w-xs p-3 text-xs">
                          <p className="mb-1.5 font-semibold">Projets</p>
                          <ul className="space-y-1">
                            {[...byProject.entries()]
                              .sort((a, b) => b[1] - a[1])
                              .map(([pid, hours]) => {
                                const proj = projectMap.get(pid)
                                return (
                                  <li key={pid} className="flex items-center justify-between gap-3">
                                    <span className="truncate">{proj?.name ?? '—'}</span>
                                    <span className="shrink-0 tabular-nums font-medium">{formatHoursLabel(hours)}</span>
                                  </li>
                                )
                              })}
                          </ul>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>

                  {/* Hours */}
                  <div className="px-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold tabular-nums text-foreground">{formatHoursLabel(totalH)}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{monthTarget}h</span>
                    </div>
                    <Progress
                      value={pct}
                      className={cn(
                        'h-1 bg-muted',
                        totalH === 0 ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500',
                      )}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    <CompletionStatusBadge status={sc} />
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="mx-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />

                  {/* Actions */}
                  <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all hover:bg-muted group-hover:opacity-100">
                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onExportUserCsv?.(usr.id)}>
                          <Download className="mr-2 h-4 w-4" /> Export CSV
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSelectUser?.(usr.id, 'profile')}>
                          <ChevronRight className="mr-2 h-4 w-4" /> Voir profil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onSelect={() => onExportUserCsv?.(usr.id)}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => onSelectUser?.(usr.id, 'profile')}>
                  <ChevronRight className="mr-2 h-4 w-4" /> Voir profil
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}

        {users.length === 0 && (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Aucun résultat avec les filtres actuels.
          </div>
        )}
      </div>
    </div>
  )
}
