import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import type { AbsenceRequest } from '@repo/shared'
import { countWorkdays, parseDateKey, CANCELLATION_REJECT_REASON, CANCELLATION_REJECT_COMMENT } from '@repo/shared'
import { api } from '~/lib/api'
import { notifyDeleted, notifyError } from '~/lib/notify'
import { AbsenceTypeBadge, AbsenceStatusBadge } from '~/components/shared/app-badges'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '~/components/ui/context-menu'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'

interface AbsenceListProps {
  absences: AbsenceRequest[]
  onRefresh?: () => void
}

export function AbsenceList({ absences, onRefresh }: AbsenceListProps) {
  const handleDelete = async (id: string) => {
    try {
      await api.absenceRequests.reject(id, {
        rejectReasonCode: CANCELLATION_REJECT_REASON,
        rejectComment: CANCELLATION_REJECT_COMMENT,
      })
      notifyDeleted('Demande annulée')
      onRefresh?.()
    } catch {
      notifyError('Impossible de supprimer la demande')
    }
  }

  if (absences.length === 0) {
    return (
      <div className="border border-border rounded-lg flex items-center justify-center py-12">
        <p className="text-muted-foreground">Aucune demande</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableBody>
          {absences.map((a) => {
            const days = countWorkdays(parseDateKey(a.startDate), parseDateKey(a.endDate)) * (a.halfDay ? 0.5 : 1)
            return (
              <ContextMenu key={a.id}>
                <ContextMenuTrigger asChild>
                  <TableRow className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="px-3 py-2.5">
                      <div className="min-w-0 space-y-0.5">
                        <AbsenceTypeBadge type={a.type} />
                        <p className="text-muted-foreground">
                          {format(parseDateKey(a.startDate), 'd MMM', { locale: fr })}
                          {a.startDate !== a.endDate && (
                            <> → {format(parseDateKey(a.endDate), 'd MMM yyyy', { locale: fr })}</>
                          )}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="w-16 px-3 py-2.5 text-center tabular-nums">
                      {days}j
                    </TableCell>
                    <TableCell className="w-24 px-3 py-2.5 text-center">
                      <AbsenceStatusBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {a.status === 'en_attente' ? (
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="size-3.5 mr-2" />
                      Annuler la demande
                    </ContextMenuItem>
                  ) : (
                    <ContextMenuItem disabled className="text-muted-foreground text-xs">
                      Seules les demandes en attente peuvent être annulées
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
