import type { TimeEntry } from '@repo/shared'
import { toDateKey, HOURS_PER_WORKDAY, parseDuration } from '@repo/shared'
import { cn, formatHoursLabel } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import type { WeekSlice } from './support-types'
import { getUserHoursForDate } from './support-types'

interface WeekHoursCellProps {
  userId: string
  slice: WeekSlice
  entryMap: Map<string, TimeEntry[]>
}

function getCompletionColor(ratio: number) {
  if (ratio >= 1) return 'bg-emerald-500'
  if (ratio >= 0.5) return 'bg-amber-500'
  return 'bg-red-400'
}

export function WeekHoursCell({ userId, slice, entryMap }: WeekHoursCellProps) {
  const target = slice.workdaysInMonth.length * HOURS_PER_WORKDAY
  const hours = slice.workdaysInMonth.reduce(
    (s, d) => s + getUserHoursForDate(userId, toDateKey(d), entryMap),
    0,
  )

  if (target === 0) return <div className="py-2 text-center text-muted-foreground">—</div>

  const ratio = target > 0 ? hours / target : 0

  const dayDetails = slice.workdaysInMonth.map((d) => {
    const dk = toDateKey(d)
    const h = getUserHoursForDate(userId, dk, entryMap)
    return { dk, h }
  })

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center gap-1 py-2">
          <span className={cn(
            'font-medium tabular-nums',
            hours === 0 ? 'text-muted-foreground' : 'text-foreground',
          )}>
            {hours === 0 ? '—' : formatHoursLabel(hours)}
          </span>
          {hours > 0 && (
            <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', getCompletionColor(ratio))}
                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
              />
            </div>
          )}
          {hours > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              / {target}h
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs space-y-0.5">
        <p className="font-medium">S{slice.isoWeek} — {slice.workdaysInMonth.length} jours ouvrés</p>
        {dayDetails.map((d) => (
          <div key={d.dk} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{d.dk}</span>
            <span className={d.h > 0 ? 'text-foreground' : 'text-muted-foreground'}>
              {d.h > 0 ? formatHoursLabel(d.h) : '—'}
            </span>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}
