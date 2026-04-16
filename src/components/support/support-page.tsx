import { useState, useCallback, useMemo } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import {
  Users, Clock, CheckCircle2, AlertTriangle,
  Search, Filter, X,
} from 'lucide-react'
import type { User, TimeEntry, AbsenceRequest } from '@repo/shared'
import { toDateKey, sumHours, parseDuration, monthTargetHours } from '@repo/shared'
import { api } from '~/lib/api'
import { notifySaved, notifyError } from '~/lib/notify'
import { cn, getUserName, formatHoursLabel } from '~/lib/utils'
import { useAllProjects, useUsers, useAppLoading } from '~/hooks/use-app-data'
import { usePageData } from '~/hooks/use-page-data'
import { KpiCard } from '~/components/shared/kpi-card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { CollaboratorsList } from '~/components/support/collaborators-list'
import { ScrollArea } from '~/components/ui/scroll-area'
import { SupportPeriodPicker } from './support-period-picker'
import { MonthlyView } from './monthly-view'
import { SupportDetailPanel } from './support-detail-panel'
import { ExportMenu } from '~/components/shared/export-menu'
import type { DetailTab, UserStat } from './support-types'
import { buildWeekSlices, buildMonthRange } from './support-types'

// --- Component ----------------------------------------------------------------

interface SupportPageProps {
  user: User
}

export function SupportPage({ user }: SupportPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()))
  const users = useUsers()
  const projects = useAllProjects()
  const appLoading = useAppLoading()

  // Filters (collaborators tab)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'complet' | 'incomplet' | 'en_retard'>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)

  // Detail panel
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailMonth, setDetailMonth] = useState(() => startOfMonth(new Date()))

  const selectedMonthLabel = format(selectedMonth, 'MMMM yyyy', { locale: fr })

  // Build full-year range
  const monthRange = useMemo(() => buildMonthRange(selectedMonth), [selectedMonth])
  const rangeStart = toDateKey(startOfMonth(monthRange[0]))
  const rangeEnd = toDateKey(endOfMonth(monthRange[monthRange.length - 1]))

  // Stable user id list — only changes when users are actually loaded
  const userIds = useMemo(() => users.map((u) => u.id).sort().join(','), [users])

  const { data: _supportData, loading: pageLoading } = usePageData(
    'support-data',
    async () => {
      const [entryResults, absences] = await Promise.all([
        Promise.allSettled(
          users.map((usr) => api.timeEntries.list(usr.id, rangeStart, rangeEnd)),
        ),
        api.absenceRequests.list({ limit: 500 }),
      ])
      const entries = entryResults
        .filter((r): r is PromiseFulfilledResult<TimeEntry[]> => r.status === 'fulfilled')
        .flatMap((r) => r.value)
      return { entries, absences }
    },
    [rangeStart, rangeEnd, userIds],
    { enabled: !!userIds },
  )
  const loading = appLoading || pageLoading
  const allEntries = _supportData?.entries ?? []
  const allAbsences = _supportData?.absences ?? []

  // --- Derived data -------------------------------------------------

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const entryMap = useMemo(() => {
    const map = new Map<string, TimeEntry[]>()
    for (const e of allEntries) {
      const key = `${e.userId}:${e.workDate}`
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return map
  }, [allEntries])

  const selectedMonthStart = toDateKey(startOfMonth(selectedMonth))
  const selectedMonthEnd = toDateKey(endOfMonth(selectedMonth))
  const selectedEntries = useMemo(
    () => allEntries.filter((e) => e.workDate >= selectedMonthStart && e.workDate <= selectedMonthEnd),
    [allEntries, selectedMonthStart, selectedMonthEnd],
  )

  const targetHoursPerUser = monthTargetHours(selectedMonth.getFullYear(), selectedMonth.getMonth())
  const totalHours = sumHours(selectedEntries)
  const targetHours = targetHoursPerUser * users.length
  const completionRate = targetHours > 0 ? Math.round((totalHours / targetHours) * 100) : 0

  const userStats: UserStat[] = useMemo(() => {
    return users.map((u) => {
      const userEntries = selectedEntries.filter((e) => e.userId === u.id)
      const total = sumHours(userEntries)
      const isComplete = total >= targetHoursPerUser
      const byProject = new Map<string, number>()
      for (const e of userEntries) {
        byProject.set(e.projectId, (byProject.get(e.projectId) ?? 0) + parseDuration(e.duration))
      }
      return { user: u, total, isComplete, byProject }
    })
  }, [users, selectedEntries, targetHoursPerUser])

  const completeCount = userStats.filter((s) => s.isComplete).length
  const lateCount = userStats.filter((s) => s.total === 0).length

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const name = getUserName(u).toLowerCase()
        const poste = (u.poste ?? '').toLowerCase()
        if (!name.includes(q) && !poste.includes(q)) return false
      }
      if (filterStatus !== 'all') {
        const stat = userStats.find((s) => s.user.id === u.id)
        if (!stat) return false
        if (filterStatus === 'complet' && !stat.isComplete) return false
        if (filterStatus === 'incomplet' && (stat.isComplete || stat.total === 0)) return false
        if (filterStatus === 'en_retard' && stat.total > 0) return false
      }
      return true
    })
  }, [users, searchQuery, filterStatus, userStats])

  const hasActiveFilter = filterStatus !== 'all'
  const clearFilters = () => setFilterStatus('all')

  // --- Detail panel -------------------------------------------------

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null
  const selectedUserStat = userStats.find((s) => s.user.id === selectedUserId) ?? null

  const detailWeekSlices = useMemo(() => buildWeekSlices(detailMonth), [detailMonth])
  const detailMonthLabel = format(detailMonth, 'MMMM yyyy', { locale: fr })
  const detailUserAbsences = useMemo(
    () => selectedUserId ? allAbsences.filter((a) => a.userId === selectedUserId) : [],
    [allAbsences, selectedUserId],
  )

  const [detailInitialTab, setDetailInitialTab] = useState<DetailTab>('weekly')

  const handleOpenDetail = (userId: string, tab: DetailTab, month?: Date) => {
    setSelectedUserId(userId)
    setDetailMonth(month ?? selectedMonth)
    setDetailInitialTab(tab)
    setDetailOpen(true)
  }

  // --- Export -------------------------------------------------------

  const exportCsv = (userSubset?: User[], targetMonth?: Date) => {
    const m = targetMonth ?? selectedMonth
    const mStart = toDateKey(startOfMonth(m))
    const mEnd = toDateKey(endOfMonth(m))
    const exportEntries = allEntries.filter((e) => {
      if (e.workDate < mStart || e.workDate > mEnd) return false
      if (userSubset && !userSubset.some((u) => u.id === e.userId)) return false
      return true
    })
    const header = 'Collaborateur;Date;Projet;Pôle;Durée (h);Heure début\n'
    const rows = exportEntries.map((e) => {
      const proj = projectMap.get(e.projectId)
      const usr = users.find((u) => u.id === e.userId)
      return `${getUserName(usr)};${e.workDate};${proj?.name ?? '—'};${proj?.pole ?? ''};${e.duration};${e.startTime ?? ''}`
    })
    const bom = '\uFEFF'
    const blob = new Blob([bom + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `saisies_${format(m, 'yyyy-MM')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notifySaved('Export généré', 'Le fichier CSV a été téléchargé.')
  }

  const exportPennylane = (userSubset?: User[]) => {
    const entries = userSubset
      ? selectedEntries.filter((e) => userSubset.some((u) => u.id === e.userId))
      : selectedEntries

    const noPole = projects.filter((p) => entries.some((e) => e.projectId === p.id) && !p.pole)
    if (noPole.length > 0) {
      notifyError('Projets sans pôle analytique détectés', noPole.map((p) => p.name).join(', '))
      return
    }

    const byUser = new Map<string, TimeEntry[]>()
    for (const e of entries) {
      const arr = byUser.get(e.userId) ?? []
      arr.push(e)
      byUser.set(e.userId, arr)
    }

    const dateStr = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
    const moisLabel = format(selectedMonth, 'MMMM', { locale: fr })
    const annee = format(selectedMonth, 'yyyy')

    const headers = [
      'Date', 'Code Journal', 'Numéro de compte', 'Libellé de compte',
      'Libellé de ligne', 'Taux de TVA du compte', 'Code pays du compte',
      'Libellé de pièce', 'Numéro de pièce', 'Débit et/ou Crédit', 'Crédit',
      'Famille de catégories', 'Catégorie', 'Identifiant de ligne',
      'Identifiant de lettrage',
    ]

    const rows: (string | number)[][] = []

    for (const [userId, userEntries] of byUser) {
      const usr = users.find((u) => u.id === userId)
      const name = getUserName(usr)
      const total = sumHours(userEntries)
      const piece = `Saisies heures ${name} ${moisLabel} ${annee}`

      // Credit line — total hours
      rows.push([
        dateStr, 'ODA', '641 000 000', 'Rémunération',
        `Saisies heures ${name} ${moisLabel} ${annee}`,
        '', '', piece, 1, 0, total, '', '', '', '',
      ])

      // Debit lines — hours per pôle
      const byPole = new Map<string, number>()
      for (const e of userEntries) {
        const pole = projectMap.get(e.projectId)?.pole
        if (!pole) continue
        byPole.set(pole, (byPole.get(pole) ?? 0) + parseDuration(e.duration))
      }

      let isFirst = true
      for (const [pole, hours] of byPole) {
        rows.push([
          dateStr, 'ODA', '641 000 000', 'Rémunération',
          `${pole} Saisies heures ${name} ${moisLabel} ${annee}`,
          '', '', piece, 1, hours, 0,
          'Pôles', pole, isFirst ? 1 : '', '',
        ])
        isFirst = false
      }
    }

    // Build XLSX workbook
    const suffix = userSubset?.length === 1 ? `_${getUserName(userSubset[0]).replace(/\s+/g, '_')}` : ''
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pennylane')
    XLSX.writeFile(wb, `pennylane_saisies${suffix}_${format(selectedMonth, 'MM_yyyy')}.xlsx`)
    notifySaved('Export Pennylane généré', 'Le fichier XLSX comptable a été téléchargé.')
  }

  const exportUserCsv = (userId: string) => {
    const usr = users.find((u) => u.id === userId)
    if (usr) exportCsv([usr])
  }

  const exportUserPennylane = (userId: string) => {
    const usr = users.find((u) => u.id === userId)
    if (usr) exportPennylane([usr])
  }

  // --- Render -------------------------------------------------------

  return (
    <Tabs defaultValue="monthly" className="flex flex-col min-h-0 flex-1">
      {/* Sticky header: KPIs + toolbar */}
      <div className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-4">
        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 mb-3">
          <KpiCard label="Équipe" value={users.length} suffix="collaborateurs" icon={Users} hint={selectedMonthLabel} />
          <KpiCard
            label="Complets"
            value={completeCount}
            suffix={`/ ${users.length}`}
            icon={CheckCircle2}
            progress={users.length > 0 ? (completeCount / users.length) * 100 : 0}
            indicatorClassName="bg-green-500"
            hint={`${users.length > 0 ? Math.round((completeCount / users.length) * 100) : 0}%`}
          />
          <KpiCard label="En retard" value={lateCount} icon={AlertTriangle} hint="Aucune saisie" />
          <KpiCard
            label="Heures totales"
            value={formatHoursLabel(totalHours)}
            suffix={`/ ${targetHours}h`}
            icon={Clock}
            progress={completionRate}
            indicatorClassName="bg-blue-500"
            hint={`${completionRate}%`}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <SupportPeriodPicker
            selectedMonth={selectedMonth}
            onSelectMonth={(month) => setSelectedMonth(month)}
            open={isPeriodOpen}
            onOpenChange={setIsPeriodOpen}
          />
          <div className="flex items-center gap-2">
            <ExportMenu onExportCsv={() => exportCsv()} onExportPennylane={() => exportPennylane()} />
            <TabsList className="rounded-lg bg-muted p-1">
              <TabsTrigger value="monthly">
                Mensuel
              </TabsTrigger>
              <TabsTrigger value="collaborators">
                Collaborateurs
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-4">
          {/* Monthly view skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-1.5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Monthly view tab */}
          <TabsContent value="monthly" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="px-4 pb-4 pt-2">
                <MonthlyView
                  month={selectedMonth}
                  users={users}
                  allEntries={allEntries}
                  projects={projects}
                  onSelectUser={handleOpenDetail}
                  onExportUserCsv={exportUserCsv}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Collaborators tab */}
          <TabsContent value="collaborators" className="flex-1 min-h-0 mt-0">
            <div className="flex flex-col gap-3 px-4 pb-4 pt-2 h-full">
              <div className="flex items-center gap-2">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Rechercher…" className="h-9 pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('h-9 gap-2', hasActiveFilter && 'border-primary/50 bg-primary/5 text-primary')}>
                      <Filter className="h-4 w-4" />
                      Filtres
                      {hasActiveFilter && (
                        <Badge variant="secondary" className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full p-0 text-xs tabular-nums">1</Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 border border-border/50 p-0 shadow-lg" align="end">
                    <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
                      <span className="font-semibold text-foreground">Filtres</span>
                      {hasActiveFilter && (
                        <button onClick={clearFilters} className="text-muted-foreground transition-colors hover:text-primary">Effacer</button>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Statut</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { value: 'all' as const, label: 'Tous' },
                          { value: 'complet' as const, label: 'Complet' },
                          { value: 'incomplet' as const, label: 'Incomplet' },
                          { value: 'en_retard' as const, label: 'En retard' },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setFilterStatus(opt.value)}
                            className={cn(
                              'rounded-md border px-3 py-2 font-medium transition-all',
                              filterStatus === opt.value
                                ? 'border-primary bg-background text-primary'
                                : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-border bg-muted/30 px-4 py-3">
                      <Button className="h-9 w-full" size="sm" onClick={() => setIsFilterOpen(false)}>Appliquer</Button>
                    </div>
                  </PopoverContent>
                </Popover>
                {hasActiveFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                    {filterStatus === 'complet' ? 'Complet' : filterStatus === 'incomplet' ? 'Incomplet' : 'En retard'}
                    <button onClick={clearFilters} className="ml-0.5 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
                  </Badge>
                )}
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <CollaboratorsList
                  users={filteredUsers}
                  entries={selectedEntries}
                  projects={projects}
                  month={selectedMonth}
                  onSelectUser={handleOpenDetail}
                  onExportUserCsv={exportUserCsv}
                />
              </ScrollArea>
            </div>
          </TabsContent>
        </>
      )}

      {/* Detail panel */}
      <SupportDetailPanel
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedUserId(null) }}
        initialTab={detailInitialTab}
        selectedUser={selectedUser}
        userStat={selectedUserStat}
        weekSlices={detailWeekSlices}
        entryMap={entryMap}
        projectMap={projectMap}
        selectedMonthLabel={detailMonthLabel}
        userAbsences={detailUserAbsences}
        onExportUserCsv={exportUserCsv}
        onExportUserPennylane={exportUserPennylane}
      />
    </Tabs>
  )
}

