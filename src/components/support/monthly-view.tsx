import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronRight, MoreHorizontal, Download, FileSpreadsheet } from 'lucide-react'
import type { User, TimeEntry, Project } from '@repo/shared'
import {
  toDateKey, getIsoWeek, getIsoWeekYear,
  HOURS_PER_WORKDAY, monthTargetHours,
} from '@repo/shared'
import { cn, getUserName, getUserInitials, formatHoursLabel } from '~/lib/utils'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { CompletionStatusBadge } from '~/components/shared/app-badges'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '~/components/ui/context-menu'
import { buildWeekSlices, getUserHoursForDate, type WeekSlice } from './support-types'

type StickState = 'full' | 'partial' | 'empty' | 'absent'

/** Use the CSS utility classes from globals.css for consistent stick styling */
const STICK_CLASS: Record<StickState, string> = {
  full: 'stick-full',
  partial: 'stick-partial',
  empty: 'stick-empty',
  absent: 'stick-absent',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStickStates(
  userId: string,
  slice: WeekSlice,
  entryMap: Map<string, TimeEntry[]>,
): { state: StickState; label: string }[] {
  return slice.workdaysInMonth.map((d) => {
    const key = toDateKey(d)
    const h = getUserHoursForDate(userId, key, entryMap)
    const dayLabel = format(d, 'EEEE d MMM', { locale: fr })
    if (h >= HOURS_PER_WORKDAY) return { state: 'full' as const, label: `${dayLabel} — ${h}h` }
    if (h > 0) return { state: 'partial' as const, label: `${dayLabel} — ${h}h (partiel)` }
    return { state: 'empty' as const, label: `${dayLabel} — non saisi` }
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WeekDaySticks({ sticks }: { sticks: { state: StickState; label: string }[] }) {
  return (
    <div className="flex h-8 items-end justify-center gap-px py-0.5 sm:h-9 sm:gap-0.5">
      {sticks.map((s, i) => (
        <span key={i} title={s.label} className={STICK_CLASS[s.state]} />
      ))}
    </div>
  )
}

function LegendStick({ state }: { state: StickState }) {
  return <span className={`inline-block ${STICK_CLASS[state]}`} />
}

function statusBadge(allComplete: boolean) {
  return allComplete ? 'complet' as const : 'incomplet' as const
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MonthlyViewProps {
  month: Date
  users: User[]
  entries: TimeEntry[]
  allEntries: TimeEntry[]
  projects: Project[]
  isCurrent?: boolean
  onSelectUser?: (userId: string, tab: 'weekly' | 'profile') => void
  onExportUserCsv?: (userId: string) => void
}

export function MonthlyView({
  month,
  users,
  entries,
  allEntries,
  projects,
  isCurrent = false,
  onSelectUser,
  onExportUserCsv,
}: MonthlyViewProps) {
  const slices = buildWeekSlices(month)
  const monthTarget = monthTargetHours(month.getFullYear(), month.getMonth())

  // Build entry lookup from ALL entries (covers cross-month weeks)
  const entryMap = new Map<string, TimeEntry[]>()
  for (const e of allEntries) {
    const key = `${e.userId}:${e.workDate}`
    const arr = entryMap.get(key) ?? []
    arr.push(e)
    entryMap.set(key, arr)
  }

  // Per-user aggregates
  const userStats = users.map((usr) => {
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
  })

  // Week column totals
  const weekTotals = slices.map((_, i) =>
    userStats.reduce((s, u) => s + u.weekHours[i], 0),
  )
  const grandTotal = userStats.reduce((s, u) => s + u.total, 0)

  if (users.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Aucune donnée pour ce mois.</p>
  }

  return (
    <div className="border-t border-border overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            <th className="w-44 px-4 py-2 text-left font-medium text-muted-foreground">Collaborateur</th>
            {slices.map((slice) => (
              <th
                key={`${slice.isoWeekYear}-${slice.isoWeek}`}
                className="w-18 min-w-18 px-1.5 py-2 text-center font-medium text-muted-foreground sm:w-24 sm:min-w-22 sm:px-3"
              >
                <div className="flex flex-col items-center gap-0.5 leading-tight">
                  <span>S{slice.isoWeek}</span>
                  <span className="text-[10px] font-normal tabular-nums text-muted-foreground/80">
                    {slice.workdaysInMonth.length}j
                  </span>
                </div>
              </th>
            ))}
            <th className="w-24 px-3 py-2 text-center font-medium text-muted-foreground">Total</th>
            <th className="w-24 px-3 py-2 text-center font-medium text-muted-foreground">Statut</th>
            <th className="w-8 px-1" aria-hidden />
            <th className="w-10 px-1" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {userStats.map(({ user, weekHours, total, allComplete }) => {
            const sc = statusBadge(allComplete)
            return (
              <ContextMenu key={user.id}>
                <ContextMenuTrigger asChild>
                  <tr
                    className="cursor-pointer transition-colors hover:bg-muted/30 group"
                    onClick={() => onSelectUser?.(user.id, 'weekly')}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground truncate">{getUserName(user)}</span>
                      </div>
                    </td>
                    {slices.map((slice, i) => (
                      <td
                        key={`${slice.isoWeekYear}-${slice.isoWeek}`}
                        className="px-1.5 py-2 text-center sm:px-3"
                      >
                        <WeekDaySticks sticks={getStickStates(user.id, slice, entryMap)} />
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-semibold text-foreground">{formatHoursLabel(total)}</span>
                      <span className="text-muted-foreground">/{monthTarget}h</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <CompletionStatusBadge status={sc} className="text-[11px]" />
                    </td>
                    <td className="px-1 py-2.5 text-center">
                      <ChevronRight className="mx-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </td>
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
                            <DropdownMenuItem onClick={() => onSelectUser?.(user.id, 'weekly')}>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              Voir détail
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
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/30">
            <td className="px-4 py-2 font-medium text-muted-foreground">Total</td>
            {weekTotals.map((wt, i) => (
              <td key={i} className="px-1.5 py-2 text-center font-semibold tabular-nums sm:px-3">
                {formatHoursLabel(wt)}
              </td>
            ))}
            <td className="px-3 py-2 text-center font-semibold tabular-nums">{formatHoursLabel(grandTotal)}</td>
            <td />
            <td />
            <td />
          </tr>
        </tfoot>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-muted/20 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">Légende</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <LegendStick state="full" /> Complet
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <LegendStick state="partial" /> Partiel
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <LegendStick state="empty" /> Vide
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <LegendStick state="absent" /> Absent
        </span>
      </div>
    </div>
  )
}
