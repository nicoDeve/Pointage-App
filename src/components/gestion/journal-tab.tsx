import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { User, AbsenceRequest } from '@repo/shared'
import { parseDateKey, countWorkdays } from '@repo/shared'
import { getUserName, getUserInitials } from '~/lib/utils'
import { AbsenceTypeBadge, AbsenceStatusBadge } from '~/components/shared/app-badges'

interface JournalTabProps {
  requests: AbsenceRequest[]
  usersById: Record<string, User>
}

export function JournalTab({ requests, usersById }: JournalTabProps) {
  const sorted = [...requests].sort(
    (a, b) =>
      new Date(b.processedAt ?? b.createdAt).getTime() -
      new Date(a.processedAt ?? a.createdAt).getTime(),
  )

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-body-muted">Aucune entrée dans le journal.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {sorted.map((r) => {
        const u = usersById[r.userId]
        const days = countWorkdays(parseDateKey(r.startDate), parseDateKey(r.endDate))
        return (
          <div key={r.id} className="flex items-center gap-3 bg-card px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-pink-400 to-purple-500 text-xs font-semibold text-white">
              {getUserInitials(u)}
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{getUserName(u)}</span>
                <AbsenceTypeBadge type={r.type} />
                <AbsenceStatusBadge status={r.status} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {format(parseDateKey(r.startDate), 'd MMM', { locale: fr })} →{' '}
                {format(parseDateKey(r.endDate), 'd MMM yyyy', { locale: fr })} · {days}j
                {r.processedAt && (
                  <> · Traité le {format(new Date(r.processedAt), 'd MMM yyyy', { locale: fr })}</>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
