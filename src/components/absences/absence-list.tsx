import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import type { AbsenceRequest } from '@repo/shared'
import { countWorkdays, parseDateKey } from '@repo/shared'
import { api } from '~/lib/api'
import { notifyDeleted, notifyError } from '~/lib/notify'
import { AbsenceTypeBadge, AbsenceStatusBadge } from '~/components/shared/app-badges'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '~/components/ui/context-menu'

interface AbsenceListProps {
  absences: AbsenceRequest[]
  onRefresh?: () => void
}

export function AbsenceList({ absences, onRefresh }: AbsenceListProps) {
  const handleDelete = async (id: string) => {
    try {
      await api.absenceRequests.reject(id, { rejectReasonCode: 'autre', rejectComment: 'Annulée par le demandeur' })
      notifyDeleted('Demande annulée')
      onRefresh?.()
    } catch {
      notifyError('Impossible de supprimer la demande')
    }
  }

  if (absences.length === 0) {
    return (
      <div className="border border-border rounded-lg flex items-center justify-center py-12">
        <p className="text-body-muted">Aucune demande</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
      {absences.map((a) => {
        const days = countWorkdays(parseDateKey(a.startDate), parseDateKey(a.endDate))
        return (
          <ContextMenu key={a.id}>
            <ContextMenuTrigger asChild>
              <div className="grid grid-cols-[1fr_auto_100px] items-center px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="min-w-0 space-y-0.5">
                  <AbsenceTypeBadge type={a.type} />
                  <p className="text-xs text-muted-foreground">
                    {format(parseDateKey(a.startDate), 'd MMM', { locale: fr })}
                    {a.startDate !== a.endDate && (
                      <> → {format(parseDateKey(a.endDate), 'd MMM yyyy', { locale: fr })}</>
                    )}
                  </p>
                </div>
                <span className="text-xs tabular-nums px-3">{days}j</span>
                <div className="flex justify-center">
                  <AbsenceStatusBadge status={a.status} />
                </div>
              </div>
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
    </div>
  )
}
