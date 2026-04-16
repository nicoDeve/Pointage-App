import { useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, Eye, X } from 'lucide-react'
import type { User, AbsenceRequest } from '@repo/shared'
import { countWorkdays, parseDateKey } from '@repo/shared'
import { getUserName, getUserInitials } from '~/lib/utils'
import { AbsenceTypeBadge } from '~/components/shared/app-badges'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '~/components/ui/context-menu'

interface PendingRequestsListProps {
  requests: AbsenceRequest[]
  usersById: Record<string, User>
  currentUserId: string
  isAdmin: boolean
  onApprove: (id: string) => void
  onReject: (request: AbsenceRequest) => void
  onViewDetail: (request: AbsenceRequest) => void
}

export function PendingRequestsList({
  requests,
  usersById,
  currentUserId,
  isAdmin,
  onApprove,
  onReject,
  onViewDetail,
}: PendingRequestsListProps) {
  const groups = useMemo(() => {
    const map = new Map<string, AbsenceRequest[]>()
    for (const r of requests) {
      const pole = usersById[r.userId]?.poste ?? 'Autre'
      if (!map.has(pole)) map.set(pole, [])
      map.get(pole)!.push(r)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [requests, usersById])

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Aucune demande en attente</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map(([pole, groupRequests]) => (
        <div key={pole}>
          <p className="mb-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            {pole}{' '}
            <span className="font-normal normal-case tracking-normal">({groupRequests.length})</span>
          </p>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {groupRequests.map((r) => {
              const isSelf = r.userId === currentUserId && !isAdmin
              const days = countWorkdays(parseDateKey(r.startDate), parseDateKey(r.endDate)) * (r.halfDay ? 0.5 : 1)
              const u = usersById[r.userId]
              return (
                <ContextMenu key={r.id}>
                  <ContextMenuTrigger asChild>
                    <div className="group flex items-center gap-3 bg-card px-3 py-2.5 hover:bg-muted/40 cursor-default select-none transition-colors">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-pink-400 to-purple-500 text-xs font-semibold text-white">
                        {getUserInitials(u)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{getUserName(u)}</span>
                          <AbsenceTypeBadge type={r.type} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(parseDateKey(r.startDate), 'd MMM', { locale: fr })} →{' '}
                          {format(parseDateKey(r.endDate), 'd MMM yyyy', { locale: fr })} · {days}j ouvré{days > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isSelf ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="outline" size="icon" className="size-7" disabled>
                                  <Check className="size-3.5" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Vous ne pouvez pas approuver votre propre demande</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7 border-green-500/60 hover:border-green-500"
                            onClick={() => onApprove(r.id)}
                          >
                            <Check className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7 text-destructive hover:bg-destructive/10"
                          onClick={() => onReject(r)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onViewDetail(r)}>
                      <Eye className="mr-2 size-3.5" />
                      Voir le détail
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      disabled={isSelf}
                      onClick={() => !isSelf && onApprove(r.id)}
                      className="text-green-600 focus:text-green-600"
                    >
                      <Check className="mr-2 size-3.5" />
                      Approuver
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => onReject(r)}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="mr-2 size-3.5" />
                      Refuser
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
