import { useEffect, useRef } from 'react'
import type { TimeEntry, Project } from '@repo/shared'
import { Skeleton } from '~/components/ui/skeleton'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
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
  const currentWeekRef = useRef<HTMLTableRowElement>(null)
  const hasScrolledRef = useRef(false)

  useEffect(() => {
    if (!loading && currentWeekRef.current && !hasScrolledRef.current) {
      currentWeekRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
      hasScrolledRef.current = true
    }
  }, [loading])

  if (loading) {
    return (
      <Table>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="px-3 py-2.5">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="mt-1.5 h-5 w-20 rounded-full" />
                </div>
              </TableCell>
              <TableCell className="w-22 px-3 py-2.5">
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </TableCell>
              <TableCell className="w-8 px-3 py-2.5">
                <Skeleton className="h-4 w-4 mx-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (weeks.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Aucune semaine ne correspond aux filtres
      </div>
    )
  }

  return (
    <Table>
      <TableBody>
        {weeks.map((w) => {
          const isCurrent = isCurrentWeek(w)
          return (
            <WeekRow
              key={`${w.year}-${w.week}`}
              ref={isCurrent ? currentWeekRef : undefined}
              week={w}
              entries={getWeekEntries(w)}
              projects={projects}
              isCurrent={isCurrent}
              isPast={isPastWeek(w)}
              onSelect={onSelectWeek}
            />
          )
        })}
      </TableBody>
    </Table>
  )
}
