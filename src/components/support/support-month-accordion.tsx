import { format, startOfMonth } from 'date-fns'
import { useEffect, useRef } from 'react'
import { fr } from 'date-fns/locale'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { User, TimeEntry, Project } from '@repo/shared'
import { cn } from '~/lib/utils'
import { PeriodStatusBadge, CompletionStatusBadge } from '~/components/shared/app-badges'
import { MonthlyView } from '~/components/support/monthly-view'
import type { MonthData, DetailTab } from './support-types'
import { getMonthStats } from './support-types'

interface SupportMonthAccordionProps {
  monthDataList: MonthData[]
  allEntries: import('@repo/shared').TimeEntry[]
  users: User[]
  projects: Project[]
  expandedMonthId: string | null
  onToggleMonth: (monthId: string) => void
  onSelectUser: (userId: string, tab: DetailTab, month: Date) => void
  onExportUserCsv: (userId: string) => void
}

export function SupportMonthAccordion({
  monthDataList,
  allEntries,
  users,
  projects,
  expandedMonthId,
  onToggleMonth,
  onSelectUser,
  onExportUserCsv,
}: SupportMonthAccordionProps) {
  const currentMonthId = format(startOfMonth(new Date()), 'yyyy-MM')
  const currentMonthRef = useRef<HTMLDivElement>(null)
  const hasScrolledRef = useRef(false)

  useEffect(() => {
    if (currentMonthRef.current && !hasScrolledRef.current) {
      hasScrolledRef.current = true
      requestAnimationFrame(() => {
        currentMonthRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      })
    }
  }, [expandedMonthId])

  return (
    <div className="space-y-2">
      {monthDataList.map((md) => {
        const isExpanded = expandedMonthId === md.id
        const isPast = md.id < currentMonthId
        const stats = getMonthStats(md, users)
        const allComplete = stats.complete === stats.total && stats.total > 0

        return (
          <div
            key={md.id}
            ref={md.isCurrent ? currentMonthRef : undefined}
            className={cn(
              'overflow-hidden rounded-lg border border-border',
              md.isCurrent && 'ring-1 ring-blue-500/25',
              !md.isCurrent && isPast && 'opacity-40 transition-opacity hover:opacity-[0.72]',
            )}
          >
            {/* Month header */}
            <button
              type="button"
              className={cn(
                'flex w-full items-center justify-between px-4 py-3 transition-colors',
                md.isCurrent
                  ? 'border-l-4 border-l-blue-600 hover:bg-muted/20 dark:border-l-blue-500'
                  : 'hover:bg-muted/30',
              )}
              onClick={() => onToggleMonth(md.id)}
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold capitalize text-foreground">{md.label}</span>
                {md.isCurrent
                  ? allComplete
                    ? <CompletionStatusBadge status="complet" />
                    : <PeriodStatusBadge status="en_cours" />
                  : isPast
                    ? <PeriodStatusBadge status="passee" />
                    : <PeriodStatusBadge status="a_venir" />
                }
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  {stats.complete}/{stats.total} complets
                </span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', allComplete ? 'bg-green-500' : 'bg-blue-500')}
                    style={{ width: `${stats.total > 0 ? (stats.complete / stats.total) * 100 : 0}%` }}
                  />
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Cross-table (expanded) */}
            {isExpanded && (
              <MonthlyView
                month={md.month}
                users={users}
                entries={md.entries}
                allEntries={allEntries}
                projects={projects}
                isCurrent={md.isCurrent}
                onSelectUser={(userId, tab) => onSelectUser(userId, tab, md.month)}
                onExportUserCsv={onExportUserCsv}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
