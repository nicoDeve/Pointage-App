import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, X } from 'lucide-react'
import type { User, AbsenceRequest } from '@repo/shared'
import { countWorkdays, parseDateKey } from '@repo/shared'
import { api } from '~/lib/api'
import { notifySaved, notifyError } from '~/lib/notify'
import { getUserName, getUserInitials } from '~/lib/utils'
import { useUsers, useRefreshPendingCount } from '~/hooks/use-app-data'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Button } from '~/components/ui/button'
import { PendingRequestsList } from './pending-requests-list'
import { JournalTab } from './journal-tab'
import { RejectDialog } from './reject-dialog'
import { AppSidePanel } from '~/components/shared/app-side-panel'
import { AbsenceTypeBadge, AbsenceStatusBadge } from '~/components/shared/app-badges'

interface GestionPageProps {
  user: User
}

export function GestionPage({ user }: GestionPageProps) {
  const [absences, setAbsences] = useState<AbsenceRequest[]>([])
  const users = useUsers()
  const refreshPendingCount = useRefreshPendingCount()
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState<AbsenceRequest | null>(null)
  const [detailTarget, setDetailTarget] = useState<AbsenceRequest | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAbsences(await api.absenceRequests.list({ limit: 500 }))
    } catch {
      notifyError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])) as Record<string, User>, [users])
  const pending = absences.filter((a) => a.status === 'en_attente')
  const processed = absences.filter((a) => a.status !== 'en_attente')

  const handleApprove = async (id: string) => {
    try {
      await api.absenceRequests.approve(id)
      notifySaved('Demande approuvée', "La décision a été enregistrée.")
      load()
      void refreshPendingCount()
    } catch {
      notifyError('Une erreur est survenue')
    }
  }

  const handleReject = async (data: { rejectReasonCode: string; rejectComment?: string }) => {
    if (!rejectTarget) return
    try {
      await api.absenceRequests.reject(rejectTarget.id, data)
      notifySaved('Demande refusée', 'Le refus et le motif ont été enregistrés.')
      setRejectTarget(null)
      load()
      void refreshPendingCount()
    } catch {
      notifyError('Une erreur est survenue')
    }
  }

  const detailUser = detailTarget ? usersById[detailTarget.userId] : null
  const detailDays = detailTarget
    ? countWorkdays(parseDateKey(detailTarget.startDate), parseDateKey(detailTarget.endDate))
    : 0

  return (
    <ScrollArea className="min-h-0 flex-1">
    <div className="flex flex-col gap-3 p-4">
      <Tabs defaultValue="pending">
        <TabsList className="rounded-lg bg-muted p-1">
          <TabsTrigger value="pending" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs">
            Demandes en attente
            {pending.length > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {pending.length > 9 ? '9+' : pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="journal" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <p className="text-body-muted animate-pulse py-8 text-center">Chargement…</p>
          ) : (
            <PendingRequestsList
              requests={pending}
              usersById={usersById}
              currentUserId={user.id}
              onApprove={handleApprove}
              onReject={setRejectTarget}
              onViewDetail={setDetailTarget}
            />
          )}
        </TabsContent>

        <TabsContent value="journal" className="mt-4">
          <JournalTab requests={processed} usersById={usersById} />
        </TabsContent>
      </Tabs>

      {/* Request detail side panel */}
      <AppSidePanel
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Détail de la demande"
        width="narrow"
        footer={
          detailTarget?.status === 'en_attente' ? (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => { setRejectTarget(detailTarget); setDetailTarget(null) }}
              >
                <X className="mr-1.5 size-3.5" />
                Refuser
              </Button>
              <Button
                className="flex-1"
                onClick={() => { handleApprove(detailTarget.id); setDetailTarget(null) }}
              >
                <Check className="mr-1.5 size-3.5" />
                Approuver
              </Button>
            </div>
          ) : undefined
        }
      >
        {detailTarget && (
          <div className="space-y-4 py-1">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-pink-400 to-purple-500 text-sm font-semibold text-white">
              {getUserInitials(detailUser)}
              </div>
              <div>
                <p className="text-sm font-medium">{getUserName(detailUser)}</p>
                <p className="text-[11px] text-muted-foreground">{detailUser?.poste ?? ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AbsenceTypeBadge type={detailTarget.type} />
              <AbsenceStatusBadge status={detailTarget.status} />
            </div>

            <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Du</span>
                <span className="font-medium">
                  {format(parseDateKey(detailTarget.startDate), 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Au</span>
                <span className="font-medium">
                  {format(parseDateKey(detailTarget.endDate), 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-1">
                <span className="text-muted-foreground">Durée</span>
                <span className="font-semibold">
                  {detailDays}j ouvré{detailDays > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {detailTarget.comment && (
              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <p className="mb-1 font-medium text-muted-foreground">Motif</p>
                <p>{detailTarget.comment}</p>
              </div>
            )}

            {detailTarget.status === 'refusee' && detailTarget.rejectComment && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
                <p className="mb-1 font-medium text-destructive">Motif de refus</p>
                <p>{detailTarget.rejectComment}</p>
              </div>
            )}

            {detailTarget.processedAt && (
              <p className="text-[11px] text-muted-foreground">
                Traité le{' '}
                {format(new Date(detailTarget.processedAt), 'd MMM yyyy à HH:mm', { locale: fr })}
              </p>
            )}
          </div>
        )}
      </AppSidePanel>

      <RejectDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </div>
    </ScrollArea>
  )
}
