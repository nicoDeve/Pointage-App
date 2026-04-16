import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronRight, MoreHorizontal, Download, TrendingUp } from 'lucide-react'
import type { User, TimeEntry, Project } from '@repo/shared'
import { toDateKey, HOURS_PER_WORKDAY, isPublicHoliday, parseDuration } from '@repo/shared'
import { cn, getUserName, getUserInitials, formatHoursLabel } from '~/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '~/components/ui/context-menu'
import { TimeEntryCell } from './time-entry-cell'

interface TeamMemberRowProps {
  user: User
  days: Date[]
  entryMap: Map<string, TimeEntry[]>
  projectMap: Map<string, Project>
  weekTarget: number
  onSelectUser?: (userId: string, tab: 'weekly' | 'profile') => void
  onExportUserCsv?: (userId: string) => void
}

function getPercentageColor(percentage: number) {
  if (percentage >= 100) return 'text-emerald-500'
  if (percentage >= 80) return 'text-amber-500'
  return 'text-red-500'
}

export function TeamMemberRow({
  user,
  days,
  entryMap,
  projectMap,
  weekTarget,
  onSelectUser,
  onExportUserCsv,
}: TeamMemberRowProps) {
  const dayData = days.map((d) => {
    const dateKey = toDateKey(d)
    const entries = entryMap.get(`${user.id}:${dateKey}`) ?? []
    const holiday = isPublicHoliday(dateKey)
    return { date: d, dateKey, entries, isHoliday: holiday }
  })

  const weekTotal = dayData.reduce(
    (s, d) => s + d.entries.reduce((s2, e) => s2 + parseDuration(e.duration), 0),
    0,
  )

  const percentage = weekTarget > 0 ? Math.round((weekTotal / weekTarget) * 100) : 0

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr
          className="border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/30 group"
          onClick={() => onSelectUser?.(user.id, 'weekly')}
        >
          {/* User identity */}
          <td className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.imageUrl ?? undefined} alt={getUserName(user)} />
                <AvatarFallback className="bg-linear-to-br from-pink-400 to-purple-500 text-white text-xs">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-foreground truncate">{getUserName(user)}</span>
                {user.poste && (
                  <span className="text-muted-foreground text-xs truncate">{user.poste}</span>
                )}
              </div>
            </div>
          </td>

          {/* Day cells */}
          {dayData.map((d) => (
            <td key={d.dateKey} className="text-center px-1">
              <TimeEntryCell
                entries={d.entries}
                projectMap={projectMap}
                isHoliday={d.isHoliday}
              />
            </td>
          ))}

          {/* Total */}
          <td className="text-right pr-4">
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-semibold text-foreground tabular-nums">
                {formatHoursLabel(weekTotal)}
              </span>
              <div className={cn('flex items-center gap-1 text-xs', getPercentageColor(percentage))}>
                <TrendingUp className="h-3 w-3" />
                <span>{percentage}%</span>
              </div>
            </div>
          </td>

          {/* Actions */}
          <td className="px-1 py-3" onClick={(e) => e.stopPropagation()}>
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
                  <DropdownMenuItem onClick={() => onSelectUser?.(user.id, 'weekly')}>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Voir détail
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSelectUser?.(user.id, 'profile')}>
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
        <ContextMenuItem onSelect={() => onSelectUser?.(user.id, 'weekly')}>
          <ChevronRight className="mr-2 h-4 w-4" />
          Voir détail
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onSelectUser?.(user.id, 'profile')}>
          <ChevronRight className="mr-2 h-4 w-4" />
          Voir profil
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
