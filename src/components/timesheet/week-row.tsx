import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronRight } from 'lucide-react'
import type { TimeEntry, Project } from '@repo/shared'
import { getIsoWeekMonday, weekTargetHours, sumHours, parseDuration } from '@repo/shared'
import { WeekHoursStatusBadge, PeriodStatusBadge } from '~/components/shared/app-badges'
import { Badge } from '~/components/ui/badge'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '~/components/ui/context-menu'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '~/components/ui/hover-card'
import { cn, formatHoursLabel } from '~/lib/utils'
import type { WeekOption } from './pointage-types'

interface WeekRowProps {
  week: WeekOption
  entries: TimeEntry[]
  projects: Project[]
  isCurrent: boolean
  isPast: boolean
  onSelect: (w: WeekOption) => void
}

export function WeekRow({ week, entries, projects, isCurrent, isPast, onSelect }: WeekRowProps) {
  const monday = getIsoWeekMonday(week.year, week.week)
  const fri = addDays(monday, 4)
  const hours = sumHours(entries)
  const target = weekTargetHours(week.year, week.week)
  const isIncomplete = hours < target
  const isPastIncomplete = isPast && isIncomplete && !isCurrent

  // Project stats for hover card
  const projectStats = new Map<string, number>()
  entries.forEach((e) => {
    projectStats.set(e.projectId, (projectStats.get(e.projectId) ?? 0) + parseDuration(e.duration))
  })
  const projectCount = projectStats.size

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'grid grid-cols-[1fr_88px_32px] items-center cursor-pointer transition-colors group px-3 py-2.5',
            isCurrent && 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500 hover:bg-blue-100/65 dark:hover:bg-blue-950/45',
            !isCurrent && isPastIncomplete && 'border-l-2 border-l-red-400 opacity-40 hover:opacity-100 hover:bg-muted/40 dark:hover:bg-muted/15',
            !isCurrent && isPast && !isPastIncomplete && 'opacity-40 hover:opacity-100 hover:bg-muted/40 dark:hover:bg-muted/15',
            !isCurrent && !isPast && 'hover:bg-muted/40 dark:hover:bg-muted/15',
          )}
          onClick={() => onSelect(week)}
        >
          {/* Week identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="app-section-title">{`Semaine ${week.week}`}</span>
              {isCurrent && <PeriodStatusBadge status="en_cours" />}
              {isPastIncomplete && <PeriodStatusBadge status="a_completer" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(monday, 'd MMM', { locale: fr })} – {format(fri, 'd MMM yyyy', { locale: fr })}
            </p>
            <HoverCard openDelay={150} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className={cn('text-xs font-normal', projectCount > 0 ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground')}>
                    {projectCount} activité{projectCount > 1 ? 's' : ''}
                  </Badge>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 p-0 shadow-xl border border-border/50 overflow-hidden" side="right" align="start">
                <div className="px-4 py-3 bg-linear-to-r from-muted/80 to-muted/40 border-b border-border/50">
                  <p className="font-semibold text-sm text-foreground">Semaine {week.week}</p>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {format(monday, 'd MMM', { locale: fr })} – {format(fri, 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {Array.from(projectStats.entries()).map(([pid, h]) => {
                    const proj = projects.find((p) => p.id === pid)
                    return (
                      <div key={pid} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{proj?.name ?? '—'}</span>
                        <span className="text-sm font-semibold text-foreground">{formatHoursLabel(h)}</span>
                      </div>
                    )
                  })}
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>

          {/* Hours + status */}
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {formatHoursLabel(hours)}<span className="text-[11px] font-normal text-muted-foreground">/{target}h</span>
            </span>
            <WeekHoursStatusBadge hours={hours} target={target} />
          </div>

          {/* Chevron */}
          <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 mx-auto" />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => onSelect(week)}>
          Ouvrir le détail de la semaine
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
