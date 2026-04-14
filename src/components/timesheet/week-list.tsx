import { useEffect, useRef } from 'react'
import type { TimeEntry, Project } from '@repo/shared'
import { Skeleton } from '~/components/ui/skeleton'
import { WeekRow } from './week-row'
import type { WeekOption } from './pointage-types'

interface WeekListProps {
  weeks: WeekOption[]
  projects: Project[]
  loading: boolean
  getWeekEntries: (w: WeekOption) => TimeEntry[]
  isCurrentWeek: (w: WeekOption) => boolean
  isPastWeek: (w: WeekOption) => boolean
  onSelectWeek: (w: WeekOption) => void
}

export function WeekList({
  weeks,
  projects,
  loading,
  getWeekEntries,
  isCurrentWeek,
  isPastWeek,
  onSelectWeek,
}: WeekListProps) {
  const currentWeekRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)

  useEffect(() => {
    if (!loading && currentWeekRef.current && !hasScrolledRef.current) {
      currentWeekRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
      hasScrolledRef.current = true
    }
  }, [loading])

  if (loading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-none" />
        ))}
      </div>
    )
  }

  if (weeks.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Aucune semaine ne correspond aux filtres
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {weeks.map((w) => {
        const isCurrent = isCurrentWeek(w)
        return (
          <div key={`${w.year}-${w.week}`} ref={isCurrent ? currentWeekRef : undefined}>
            <WeekRow
              week={w}
              entries={getWeekEntries(w)}
              projects={projects}
              isCurrent={isCurrent}
              isPast={isPastWeek(w)}
              onSelect={onSelectWeek}
            />
          </div>
        )
      })}
    </div>
  )
}
