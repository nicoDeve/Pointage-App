import { useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { TimeEntry, Project } from '@repo/shared'
import {
  toDateKey,
  getIsoWeekWorkdays,
  weekTargetHours,
  isPublicHoliday,
  getHolidayLabel,
  HOURS_PER_WORKDAY,
  sumHours,
} from '@repo/shared'
import { WeekHoursStatusBadge, PeriodStatusBadge } from '~/components/shared/app-badges'
import { WeekSelectorPopover } from '~/components/shared/week-selector-popover'
import { Button } from '~/components/ui/button'
import { Progress } from '~/components/ui/progress'
import { Skeleton } from '~/components/ui/skeleton'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '~/components/ui/context-menu'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
import { cn, dayHoursTextClass, formatHoursLabel } from '~/lib/utils'
import type { WeekOption } from './pointage-types'

interface DayViewProps {
  selectedWeek: WeekOption
  entries: TimeEntry[]
  projects: Project[]
  availableWeeks: WeekOption[]
  loading: boolean
  isCurrent: boolean
  isPast: boolean
  onWeekChange: (w: WeekOption) => void
  onBack: () => void
  onDaySelect: (dateKey: string) => void
}

export function DayView({
  selectedWeek,
  entries,
  projects,
  availableWeeks,
  loading,
  isCurrent,
  isPast,
  onWeekChange,
  onBack,
  onDaySelect,
}: DayViewProps) {
  const totalHours = sumHours(entries)
  const target = weekTargetHours(selectedWeek.year, selectedWeek.week)

  const workdays = useMemo(
    () => getIsoWeekWorkdays(selectedWeek.year, selectedWeek.week),
    [selectedWeek.year, selectedWeek.week],
  )

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 w-full sm:w-auto sm:max-w-md">
            <WeekSelectorPopover weeks={availableWeeks} selected={selectedWeek} onSelect={onWeekChange} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isCurrent && <PeriodStatusBadge status="en_cours" />}
            {isPast && !isCurrent && <PeriodStatusBadge status="passee" />}
            {!isPast && !isCurrent && <PeriodStatusBadge status="a_venir" />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-bold text-foreground">
              {formatHoursLabel(totalHours)}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {target}h</span>
            </p>
            <Progress
              value={target > 0 ? (totalHours / target) * 100 : 0}
              className="h-1.5 w-28 bg-muted"
              indicatorClassName={totalHours >= target ? 'bg-green-500' : 'bg-blue-500'}
            />
          </div>
          <WeekHoursStatusBadge hours={totalHours} target={target} />
        </div>
      </div>

      {/* Day rows */}
      <Table>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4} className="p-0">
                  <Skeleton className="h-14 w-full rounded-none" />
                </TableCell>
              </TableRow>
            ))
          ) : (
            workdays.map((day) => {
              const dateKey = toDateKey(day)
              const holiday = isPublicHoliday(dateKey) ? getHolidayLabel(dateKey) : null
              const dayEntries = entries.filter((e) => e.workDate === dateKey)
              const dayHours = sumHours(dayEntries)
              const uniqueProjectIds = [...new Set(dayEntries.map((e) => e.projectId))]

              if (holiday) {
                return (
                  <TableRow key={dateKey} className="cursor-default bg-muted/25 dark:bg-muted/10 hover:bg-muted/25">
                    <TableCell className="px-4 py-3">
                      <span className="font-medium capitalize">{format(day, 'EEEE', { locale: fr })}</span>
                      <span className="text-xs text-muted-foreground tabular-nums ml-1.5">{format(day, 'd MMM.', { locale: fr })}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <PeriodStatusBadge status="ferie" label={`Férié · ${holiday}`} />
                    </TableCell>
                    <TableCell className="w-24 px-4 py-3 text-center">
                      <span className="font-semibold text-muted-foreground">—</span>
                      <span className="text-xs text-muted-foreground"> / {HOURS_PER_WORKDAY}h</span>
                    </TableCell>
                    <TableCell className="w-8 px-4 py-3" />
                  </TableRow>
                )
              }

              return (
                <ContextMenu key={dateKey}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/40 dark:hover:bg-muted/15 group"
                      onClick={() => onDaySelect(dateKey)}
                    >
                      <TableCell className="px-4 py-3">
                        <span className="font-medium capitalize">{format(day, 'EEEE', { locale: fr })}</span>
                        <span className="text-xs text-muted-foreground tabular-nums ml-1.5">{format(day, 'd MMM.', { locale: fr })}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {uniqueProjectIds.length > 0 ? (
                            uniqueProjectIds.slice(0, 3).map((pid) => {
                              const p = projects.find((pr) => pr.id === pid)
                              return (
                                <span key={pid} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border bg-background text-foreground/70">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p?.color ?? '#888' }} />
                                  {p?.name ?? '—'}
                                </span>
                              )
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                          {uniqueProjectIds.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{uniqueProjectIds.length - 3}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="w-24 px-4 py-3 text-center">
                        <span className={cn('font-semibold', dayHoursTextClass(dayHours))}>
                          {formatHoursLabel(dayHours)}
                        </span>
                        <span className="text-xs text-muted-foreground"> / {HOURS_PER_WORKDAY}h</span>
                      </TableCell>
                      <TableCell className="w-8 px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 mx-auto" />
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-52">
                    <ContextMenuItem onSelect={() => onDaySelect(dateKey)}>
                      Ouvrir ce jour
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
