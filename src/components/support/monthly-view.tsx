import { useMemo } from 'react'
import type { User, TimeEntry, Project } from '@repo/shared'
import {
  toDateKey, HOURS_PER_WORKDAY, monthTargetHours,
} from '@repo/shared'
import { cn, getUserName, getUserInitials, formatHoursLabel } from '~/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { CompletionStatusBadge, getCompletionStatus } from '~/components/shared/app-badges'
import { ChevronRight, MoreHorizontal, Download } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '~/components/ui/context-menu'
import { TrendingUp } from 'lucide-react'
import { WeekHoursCell } from './week-hours-cell'
import { buildWeekSlices, getUserHoursForDate } from './support-types'
import type { DetailTab } from './support-types'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MonthlyViewProps {
  month: Date
  users: User[]
  allEntries: TimeEntry[]
  projects: Project[]
  onSelectUser?: (userId: string, tab: DetailTab, month?: Date) => void
  onExportUserCsv?: (userId: string) => void
}

export function MonthlyView({
  month,
  users,
  allEntries,
  projects,
  onSelectUser,
  onExportUserCsv,
}: MonthlyViewProps) {
  const slices = useMemo(() => buildWeekSlices(month), [month])
  const monthTarget = monthTargetHours(month.getFullYear(), month.getMonth())

  // Build entry lookup from ALL entries (covers cross-month weeks)
  const entryMap = useMemo(() => {
    const map = new Map<string, TimeEntry[]>()
    for (const e of allEntries) {
      const key = `${e.userId}:${e.workDate}`
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return map
  }, [allEntries])

  // Per-user aggregates
  const userStats = useMemo(() =>
    users.map((usr) => {
      const weekHours = slices.map((slice) =>
        slice.workdaysInMonth.reduce(
          (s, d) => s + getUserHoursForDate(usr.id, toDateKey(d), entryMap),
          0,
        ),
      )
      const total = weekHours.reduce((s, h) => s + h, 0)
      const sliceTargets = slices.map((sl) => sl.workdaysInMonth.length * HOURS_PER_WORKDAY)
      const allComplete = weekHours.every((h, i) => h >= sliceTargets[i])
      return { user: usr, weekHours, total, allComplete }
    }),
  [users, slices, entryMap])

  if (users.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Aucune donnée pour ce mois.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/30 border-b border-border">
            <th className="w-52 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Collaborateur
            </th>
            {slices.map((slice) => (
              <th
                key={`${slice.isoWeekYear}-${slice.isoWeek}`}
                className="min-w-20 px-1 py-2.5 text-center text-xs font-medium text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-0.5 leading-tight">
                  <span className="font-semibold">S{slice.isoWeek}</span>
                  <span className="text-xs font-normal tabular-nums text-muted-foreground/70">
                    {slice.workdaysInMonth.length}j
                  </span>
                </div>
              </th>
            ))}
            <th className="w-28 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
              Total
            </th>
            <th className="w-10 px-1" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {userStats.map(({ user, weekHours, total, allComplete }) => {
            const pct = monthTarget > 0 ? Math.round((total / monthTarget) * 100) : 0
            const pctColor = pct >= 100 ? 'text-emerald-500' : pct >= 80 ? 'text-amber-500' : 'text-red-500'

            return (
              <ContextMenu key={user.id}>
                <ContextMenuTrigger asChild>
                  <tr
                    className="cursor-pointer transition-colors hover:bg-muted/30 group"
                    onClick={() => onSelectUser?.(user.id, 'weekly', month)}
                  >
                    {/* User identity */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={user.imageUrl ?? undefined} alt={getUserName(user)} />
                          <AvatarFallback className="bg-linear-to-br from-pink-400 to-purple-500 text-white text-xs">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground truncate">
                            {getUserName(user)}
                          </span>
                          {user.poste && (
                            <span className="text-muted-foreground text-xs truncate">
                              {user.poste}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Week cells */}
                    {slices.map((slice) => (
                      <td
                        key={`${slice.isoWeekYear}-${slice.isoWeek}`}
                        className="px-1 text-center"
                      >
                        <WeekHoursCell
                          userId={user.id}
                          slice={slice}
                          entryMap={entryMap}
                        />
                      </td>
                    ))}

                    {/* Total + % */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatHoursLabel(total)}
                          </span>
                          <span className="text-xs text-muted-foreground">/{monthTarget}h</span>
                        </div>
                        <div className={cn('flex items-center gap-1', pctColor)}>
                          <TrendingUp className="h-3 w-3" />
                          <span className="tabular-nums">{pct}%</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-1 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all hover:bg-muted group-hover:opacity-100">
                              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onExportUserCsv?.(user.id)}>
                              <Download className="mr-2 h-4 w-4" />
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onSelectUser?.(user.id, 'weekly', month)}>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              Voir détail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSelectUser?.(user.id, 'profile', month)}>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              Voir profil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onSelect={() => onExportUserCsv?.(user.id)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => onSelectUser?.(user.id, 'weekly', month)}>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Voir détail
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => onSelectUser?.(user.id, 'profile', month)}>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Voir profil
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
