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
          <div className="min-w-0 w-[min(100%,18rem)] sm:w-auto sm:max-w-md">
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
            <p className="text-sm font-bold text-foreground">
              {formatHoursLabel(totalHours)}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {target}h</span>
            </p>
            <Progress
              value={target > 0 ? (totalHours / target) * 100 : 0}
              className={cn('h-1.5 w-28 bg-muted', totalHours >= target ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500')}
            />
          </div>
          <WeekHoursStatusBadge hours={totalHours} target={target} />
        </div>
      </div>

      {/* Day rows */}
      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-none" />
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
                <div
                  key={dateKey}
                  className="grid grid-cols-[1fr_auto_90px_32px] items-center px-4 py-3 cursor-default bg-muted/25 dark:bg-muted/10"
                >
                  <div>
                    <span className="text-sm font-medium capitalize">{format(day, 'EEEE', { locale: fr })}</span>
                    <span className="text-[11px] tabular-nums text-muted-foreground ml-1.5">{format(day, 'd MMM.', { locale: fr })}</span>
                  </div>
                  <div className="pr-4">
                    <PeriodStatusBadge status="ferie" label={`Férié · ${holiday}`} />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-muted-foreground">—</span>
                    <span className="text-xs text-muted-foreground"> / {HOURS_PER_WORKDAY}h</span>
                  </div>
                  <div className="w-4 mx-auto" />
                </div>
              )
            }

            return (
              <ContextMenu key={dateKey}>
                <ContextMenuTrigger asChild>
                  <div
                    className="grid grid-cols-[1fr_auto_90px_32px] items-center px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40 dark:hover:bg-muted/15 group"
                    onClick={() => onDaySelect(dateKey)}
                  >
                    <div>
                      <span className="text-sm font-medium capitalize">{format(day, 'EEEE', { locale: fr })}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground ml-1.5">{format(day, 'd MMM.', { locale: fr })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pr-4 flex-wrap">
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
                        <span className="text-xs hours-empty">—</span>
                      )}
                      {uniqueProjectIds.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{uniqueProjectIds.length - 3}</span>
                      )}
                    </div>
                    <div className="text-center">
                      <span className={cn('text-sm font-semibold', dayHoursTextClass(dayHours))}>
                        {formatHoursLabel(dayHours)}
                      </span>
                      <span className="text-xs text-muted-foreground"> / {HOURS_PER_WORKDAY}h</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 mx-auto" />
                  </div>
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
      </div>
    </div>
  )
}
