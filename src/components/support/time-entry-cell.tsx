import type { TimeEntry, Project } from '@repo/shared'
import { parseDuration, HOURS_PER_WORKDAY, PROJECT_COLORS } from '@repo/shared'
import { cn, formatHoursLabel } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

interface TimeEntryCellProps {
  entries: TimeEntry[]
  projectMap: Map<string, Project>
  isHoliday?: boolean
}

function getCompletionColor(ratio: number) {
  if (ratio >= 1) return 'bg-emerald-500'
  if (ratio >= 0.5) return 'bg-amber-500'
  return 'bg-red-400'
}

export function TimeEntryCell({ entries, projectMap, isHoliday }: TimeEntryCellProps) {
  if (isHoliday) {
    return (
      <div className="flex flex-col items-center justify-center py-2">
        <span className="text-muted-foreground text-xs">Férié</span>
      </div>
    )
  }

  const totalHours = entries.reduce((s, e) => s + parseDuration(e.duration), 0)

  if (totalHours === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-2">
        <span className="text-muted-foreground text-lg font-medium">—</span>
      </div>
    )
  }

  const ratio = totalHours / HOURS_PER_WORKDAY
  const topProject = entries.length > 0
    ? projectMap.get(entries.reduce((top, e) => parseDuration(e.duration) > parseDuration(top.duration) ? e : top, entries[0]).projectId)
    : undefined

  const tooltipLines = entries.map((e) => {
    const proj = projectMap.get(e.projectId)
    return `${proj?.name ?? '—'}: ${formatHoursLabel(parseDuration(e.duration))}`
  })

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center gap-1.5 py-2">
          <span className="text-foreground font-medium tabular-nums">
            {formatHoursLabel(totalHours)}
          </span>
          <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', getCompletionColor(ratio))}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
          {topProject && (
            <span className="text-xs text-muted-foreground max-w-16 truncate">
              {topProject.name}
            </span>
          )}
        </div>
      </TooltipTrigger>
      {tooltipLines.length > 0 && (
        <TooltipContent side="top" className="text-xs space-y-0.5">
          {tooltipLines.map((line, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-sm"
                style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] }}
              />
              {line}
            </div>
          ))}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
