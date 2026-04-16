import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, X } from 'lucide-react'
import type { User, AbsenceRequest } from '@repo/shared'
import { countWorkdays, parseDateKey, hasRole } from '@repo/shared'
import { api } from '~/lib/api'
import { notifySaved, notifyError } from '~/lib/notify'
import { getUserName, getUserInitials } from '~/lib/utils'
import { useUsers, useAppLoading, useRefreshPendingCount } from '~/hooks/use-app-data'
import { usePageData } from '~/hooks/use-page-data'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Skeleton } from '~/components/ui/skeleton'
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
  const { data: _absences, loading, reload } = usePageData(
    'gestion-absences',
    () => api.absenceRequests.list({ limit: 500 }),
    [],
  )
  const absences = _absences ?? []
  const users = useUsers()
  const appLoading = useAppLoading()
  const refreshPendingCount = useRefreshPendingCount()
  const [rejectTarget, setRejectTarget] = useState<AbsenceRequest | null>(null)
  const [detailTarget, setDetailTarget] = useState<AbsenceRequest | null>(null)

  const isLoading = loading || appLoading

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])) as Record<string, User>, [users])
  const pending = absences.filter((a) => a.status === 'en_attente')
  const processed = absences.filter((a) => a.status !== 'en_attente')

  const handleApprove = async (id: string) => {
    try {
      await api.absenceRequests.approve(id)
      notifySaved('Demande approuvée', "La décision a été enregistrée.")
      reload()
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
      reload()
      void refreshPendingCount()
    } catch {
      notifyError('Une erreur est survenue')
    }
  }

  const detailUser = detailTarget ? usersById[detailTarget.userId] : null
  const detailDays = detailTarget
    ? countWorkdays(parseDateKey(detailTarget.startDate), parseDateKey(detailTarget.endDate)) * (detailTarget.halfDay ? 0.5 : 1)
    : 0

  return (
    <ScrollArea className="min-h-0 flex-1">
    <div className="flex flex-col gap-3 p-4">
      <Tabs defaultValue="pending">
        <TabsList className="rounded-lg bg-muted p-1">
          <TabsTrigger value="pending">
            Demandes en attente
            {pending.length > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {pending.length > 9 ? '9+' : pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 2 }).map((_, gi) => (
                <div key={gi} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3.5 w-48" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Skeleton className="size-7 rounded-md" />
                          <Skeleton className="size-7 rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PendingRequestsList
              requests={pending}
              usersById={usersById}
              currentUserId={user.id}
              isAdmin={hasRole(user.roles, ['admin'])}
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
              variant="outline"
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
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-pink-400 to-purple-500 font-semibold text-white">
              {getUserInitials(detailUser)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{getUserName(detailUser)}</p>
                <p className="truncate text-xs text-muted-foreground">{detailUser?.poste ?? ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AbsenceTypeBadge type={detailTarget.type} />
              <AbsenceStatusBadge status={detailTarget.status} />
            </div>

            <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1">
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
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="mb-1 font-medium text-muted-foreground">Motif</p>
                <p className="wrap-anywhere">{detailTarget.comment}</p>
              </div>
            )}

            {detailTarget.status === 'refusee' && detailTarget.rejectComment && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="mb-1 font-medium text-destructive">Motif de refus</p>
                <p className="wrap-anywhere">{detailTarget.rejectComment}</p>
              </div>
            )}

            {detailTarget.processedAt && (
              <p className="text-xs text-muted-foreground">
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
