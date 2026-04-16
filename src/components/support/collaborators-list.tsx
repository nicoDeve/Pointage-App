import type { User, TimeEntry, Project } from '@repo/shared'
import { sumHours, parseDuration, monthTargetHours } from '@repo/shared'
import { getUserName, getUserInitials, formatHoursLabel } from '~/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { CompletionStatusBadge, getCompletionStatus } from '~/components/shared/app-badges'
import { Badge } from '~/components/ui/badge'
import { Progress } from '~/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
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
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Collaborateur</TableHead>
            <TableHead className="w-20 text-center text-xs uppercase tracking-wider text-muted-foreground">Projets</TableHead>
            <TableHead className="w-28 text-center text-xs uppercase tracking-wider text-muted-foreground">Heures</TableHead>
            <TableHead className="w-24 text-center text-xs uppercase tracking-wider text-muted-foreground">Statut</TableHead>
            <TableHead className="w-8" />
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((usr) => {
            const userEntries = entries.filter((e) => e.userId === usr.id)
            const totalH = sumHours(userEntries)
            const pct = monthTarget > 0 ? Math.min(100, Math.round((totalH / monthTarget) * 100)) : 0

            const byProject = new Map<string, number>()
            for (const e of userEntries) {
              byProject.set(e.projectId, (byProject.get(e.projectId) ?? 0) + parseDuration(e.duration))
            }
            const projectIds = [...byProject.keys()]

            const sc = getCompletionStatus(totalH, monthTarget)

            return (
              <ContextMenu key={usr.id}>
                <ContextMenuTrigger asChild>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/30 group"
                    onClick={() => onSelectUser?.(usr.id, 'profile')}
                  >
                    {/* Identity */}
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={usr.imageUrl ?? undefined} alt={getUserName(usr)} />
                          <AvatarFallback className="bg-linear-to-br from-pink-400 to-purple-500 text-white text-xs">
                            {getUserInitials(usr)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{getUserName(usr)}</p>
                          {usr.poste && <p className="truncate text-xs text-muted-foreground">{usr.poste}</p>}
                        </div>
                      </div>
                    </TableCell>

                    {/* Projects */}
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="gap-1 font-normal">
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
                    </TableCell>

                    {/* Hours */}
                    <TableCell className="px-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold tabular-nums text-foreground">{formatHoursLabel(totalH)}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{monthTarget}h</span>
                      </div>
                      <Progress
                        value={pct}
                        className="h-1 bg-muted"
                        indicatorClassName={totalH === 0 ? 'bg-red-500' : 'bg-blue-500'}
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <CompletionStatusBadge status={sc} />
                    </TableCell>

                    {/* Chevron */}
                    <TableCell>
                      <ChevronRight className="mx-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
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
                    </TableCell>
                  </TableRow>
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
        </TableBody>
      </Table>
    </div>
  )
}
