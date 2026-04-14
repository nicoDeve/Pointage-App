import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { startOfYear } from 'date-fns'
import type { User } from '@repo/shared'
import {
  AbsenceListFilter,
  ABSENCE_LIST_FILTER_LABELS,
  HOURS_PER_WORKDAY,
  countWorkdays,
  parseDateKey,
  toDateKey,
} from '@repo/shared'
import { api } from '~/lib/api'
import { notifySaved } from '~/lib/notify'
import { usePageData } from '~/hooks/use-page-data'
import { KpiCard } from '~/components/shared/kpi-card'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ScrollArea } from '~/components/ui/scroll-area'
import { AbsenceList } from './absence-list'
import { AbsenceFormPanel } from './absence-form-panel'

interface AbsencesPageProps {
  user: User
}

export function AbsencesPage({ user }: AbsencesPageProps) {
  const [filter, setFilter] = useState<AbsenceListFilter>('all')
  const [panelOpen, setPanelOpen] = useState(false)

  const { data: _absences, loading, reload } = usePageData(
    () => api.absenceRequests.list({ userId: user.id }),
    [user.id],
  )
  const absences = _absences ?? []

  const leaveQuota = Number(user.leaveQuota ?? 25)
  const yearStart = toDateKey(startOfYear(new Date()))

  const filtered = useMemo(() =>
    filter === 'all' ? absences : absences.filter((a) => a.status === filter),
    [absences, filter],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = { en_attente: 0, approuvee: 0, refusee: 0 }
    absences.forEach((a) => { if (c[a.status] !== undefined) c[a.status]++ })
    return c
  }, [absences])

  // CP : jours approuvés cette année
  const approvedCPDays = useMemo(() =>
    absences
      .filter((a) => a.type === 'conges_payes' && a.status === 'approuvee' && a.startDate >= yearStart)
      .reduce((s, a) => s + countWorkdays(parseDateKey(a.startDate), parseDateKey(a.endDate)), 0),
    [absences, yearStart],
  )
  const remainingCP = Math.max(0, leaveQuota - approvedCPDays)

  // TT quota : 10j par défaut
  const TT_QUOTA = 10
  const approvedTTDays = useMemo(() =>
    absences
      .filter((a) => a.type === 'teletravail' && a.status === 'approuvee' && a.startDate >= yearStart)
      .reduce((s, a) => s + countWorkdays(parseDateKey(a.startDate), parseDateKey(a.endDate)), 0),
    [absences, yearStart],
  )
  const remainingTT = Math.max(0, TT_QUOTA - approvedTTDays)

  const otherDays = useMemo(() =>
    absences
      .filter((a) => ['maladie', 'sans_solde'].includes(a.type) && a.status !== 'refusee')
      .reduce((s, a) => s + countWorkdays(parseDateKey(a.startDate), parseDateKey(a.endDate)), 0),
    [absences],
  )

  const onCreated = () => {
    reload()
    setPanelOpen(false)
    notifySaved('Demande enregistrée', 'Votre demande a été transmise pour validation.')
  }

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0 flex-1">
      {/* KPI */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <KpiCard
          label="Congés payés"
          value={remainingCP}
          suffix={`/ ${leaveQuota} j`}
          progress={leaveQuota > 0 ? (approvedCPDays / leaveQuota) * 100 : 0}
          colorClass="[&>div]:bg-violet-500"
          hint={`${approvedCPDays} j utilisés · ${approvedCPDays * HOURS_PER_WORKDAY}h équivalent`}
          loading={loading}
        />
        <KpiCard
          label="Télétravail"
          value={remainingTT}
          suffix={`/ ${TT_QUOTA} j`}
          progress={TT_QUOTA > 0 ? (approvedTTDays / TT_QUOTA) * 100 : 0}
          colorClass="[&>div]:bg-sky-500"
          hint={`${approvedTTDays} j utilisés`}
          loading={loading}
        />
        <KpiCard
          label="Maladie & sans solde"
          value={otherDays}
          unit="j"
          progress={otherDays > 0 ? Math.min(100, (otherDays / 30) * 100) : 0}
          colorClass="[&>div]:bg-red-500"
          hint="Jours ouvrés cumulés"
          loading={loading}
        />
      </div>

      {/* Filter + liste */}
      <div className="min-h-0 flex-1 flex flex-col space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="app-section-title">Mes demandes</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-2 sm:h-9"
              onClick={() => setPanelOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle absence
            </Button>
            <Select value={filter} onValueChange={(v) => setFilter(v as AbsenceListFilter)}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ABSENCE_LIST_FILTER_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                    {key !== 'all' && ` (${counts[key] ?? 0})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <AbsenceList absences={filtered} onRefresh={reload} />
          )}
        </ScrollArea>
      </div>

      <AbsenceFormPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        userId={user.id}
        existingAbsences={absences}
        onCreated={onCreated}
      />
    </div>
  )
}
