import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import {
  Users, Clock, CheckCircle2, AlertTriangle,
  Search, Filter, X,
} from 'lucide-react'
import type { User, TimeEntry } from '@repo/shared'
import { toDateKey, sumHours, parseDuration, monthTargetHours } from '@repo/shared'
import { api } from '~/lib/api'
import { notifySaved, notifyError } from '~/lib/notify'
import { cn, getUserName, formatHoursLabel } from '~/lib/utils'
import { useAllProjects, useUsers } from '~/hooks/use-app-data'
import { KpiCard } from '~/components/shared/kpi-card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { CollaboratorsList } from '~/components/support/collaborators-list'
import { ScrollArea } from '~/components/ui/scroll-area'
import { SupportPeriodPicker } from './support-period-picker'
import { SupportMonthAccordion } from './support-month-accordion'
import { SupportDetailPanel } from './support-detail-panel'
import { ExportMenu } from '~/components/shared/export-menu'
import type { DetailTab, MonthData, UserStat } from './support-types'
import { buildWeekSlices, buildMonthRange } from './support-types'

// ─── Component ────────────────────────────────────────────────────────────────

interface SupportPageProps {
  user: User
}

export function SupportPage({ user }: SupportPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()))
  const users = useUsers()
  const projects = useAllProjects()
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Filters (collaborators tab)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'complet' | 'incomplet' | 'en_retard'>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)

  // Month accordion
  const [expandedMonthId, setExpandedMonthId] = useState<string | null>(null)

  // Detail panel
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailMonth, setDetailMonth] = useState(() => startOfMonth(new Date()))

  const selectedMonthLabel = format(selectedMonth, 'MMMM yyyy', { locale: fr })
  const currentMonthId = format(startOfMonth(new Date()), 'yyyy-MM')

  // Build full-year range
  const monthRange = useMemo(() => buildMonthRange(selectedMonth), [selectedMonth])
  const rangeStart = toDateKey(startOfMonth(monthRange[0]))
  const rangeEnd = toDateKey(endOfMonth(monthRange[monthRange.length - 1]))

  const load = useCallback(async () => {
    if (users.length === 0) return
    setLoading(true)
    try {
      const results = await Promise.allSettled(
        users.map((usr) => api.timeEntries.list(usr.id, rangeStart, rangeEnd)),
      )
      const entries = results
        .filter((r): r is PromiseFulfilledResult<TimeEntry[]> => r.status === 'fulfilled')
        .flatMap((r) => r.value)
      setAllEntries(entries)
    } catch {
      notifyError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }, [rangeStart, rangeEnd, users])

  useEffect(() => { load() }, [load])

  // Auto-expand current month on first load only
  const hasAutoExpanded = useRef(false)
  useEffect(() => {
    if (!loading && !hasAutoExpanded.current) {
      hasAutoExpanded.current = true
      setExpandedMonthId(currentMonthId)
    }
  }, [loading, currentMonthId])

  // ─── Derived data ─────────────────────────────────────────────────

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

  const monthDataList: MonthData[] = useMemo(() => {
    const list = monthRange.map((m) => {
      const mStart = toDateKey(startOfMonth(m))
      const mEnd = toDateKey(endOfMonth(m))
      const entries = allEntries.filter((e) => e.workDate >= mStart && e.workDate <= mEnd)
      const id = format(m, 'yyyy-MM')
      return { month: m, id, label: format(m, 'MMMM yyyy', { locale: fr }), entries, isCurrent: id === currentMonthId }
    })
    // Chronological order — current month scrolled into view by accordion
    return list.sort((a, b) => a.id.localeCompare(b.id))
  }, [monthRange, allEntries, currentMonthId])

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

  // ─── Detail panel ─────────────────────────────────────────────────

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null
  const selectedUserStat = userStats.find((s) => s.user.id === selectedUserId) ?? null

  const detailWeekSlices = useMemo(() => buildWeekSlices(detailMonth), [detailMonth])
  const detailMonthLabel = format(detailMonth, 'MMMM yyyy', { locale: fr })

  const handleOpenDetail = (userId: string, _tab: DetailTab, month?: Date) => {
    setSelectedUserId(userId)
    setDetailMonth(month ?? selectedMonth)
    setDetailOpen(true)
  }

  // ─── Export ───────────────────────────────────────────────────────

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

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0 flex-1">
      {/* KPI cards */}
      <div className="shrink-0 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Équipe" value={users.length} suffix="collaborateurs" icon={Users} hint={selectedMonthLabel} />
        <KpiCard
          label="Complets"
          value={completeCount}
          suffix={`/ ${users.length}`}
          icon={CheckCircle2}
          progress={users.length > 0 ? (completeCount / users.length) * 100 : 0}
          colorClass="[&>div]:bg-green-500"
          hint={`${users.length > 0 ? Math.round((completeCount / users.length) * 100) : 0}%`}
        />
        <KpiCard label="En retard" value={lateCount} icon={AlertTriangle} hint="Aucune saisie" />
        <KpiCard
          label="Heures totales"
          value={formatHoursLabel(totalHours)}
          suffix={`/ ${targetHours}h`}
          icon={Clock}
          progress={completionRate}
          colorClass="[&>div]:bg-blue-500"
          hint={`${completionRate}%`}
        />
      </div>

      {loading ? (
        <p className="animate-pulse py-8 text-center text-xs text-muted-foreground">Chargement…</p>
      ) : (
        <Tabs defaultValue="monthly" className="flex flex-1 min-h-0 flex-col">
          {/* Toolbar */}
          <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <SupportPeriodPicker
                selectedMonth={selectedMonth}
                onSelectMonth={(month, monthId) => {
                  setSelectedMonth(month)
                  setExpandedMonthId(monthId)
                }}
                open={isPeriodOpen}
                onOpenChange={setIsPeriodOpen}
              />
              <ExportMenu onExportCsv={() => exportCsv()} onExportPennylane={() => exportPennylane()} />
            </div>
            <TabsList className="inline-flex h-8 w-fit shrink-0 rounded-md bg-muted/50 p-0.5 sm:h-9">
              <TabsTrigger value="monthly" className="rounded-sm px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm">
                Mensuel
              </TabsTrigger>
              <TabsTrigger value="collaborators" className="rounded-sm px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm">
                Collaborateurs
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Monthly accordion tab */}
          <TabsContent value="monthly" className="mt-3 min-h-0" asChild>
          <ScrollArea>
            <SupportMonthAccordion
              monthDataList={monthDataList}
              allEntries={allEntries}
              users={users}
              projects={projects}
              expandedMonthId={expandedMonthId}
              onToggleMonth={(id) => setExpandedMonthId((prev) => prev === id ? null : id)}
              onSelectUser={handleOpenDetail}
              onExportUserCsv={exportUserCsv}
            />
          </ScrollArea>
          </TabsContent>

          {/* Collaborators tab */}
          <TabsContent value="collaborators" className="mt-3 min-h-0" asChild>
          <ScrollArea>
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
                    <span className="text-sm font-semibold text-foreground">Filtres</span>
                    {hasActiveFilter && (
                      <button onClick={clearFilters} className="text-xs text-muted-foreground transition-colors hover:text-primary">Effacer</button>
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
                            'rounded-md border px-3 py-2 text-xs font-medium transition-all',
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
            <CollaboratorsList
              users={filteredUsers}
              entries={selectedEntries}
              projects={projects}
              month={selectedMonth}
              onSelectUser={handleOpenDetail}
              onExportUserCsv={exportUserCsv}
            />
          </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Detail panel */}
      <SupportDetailPanel
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedUserId(null) }}
        selectedUser={selectedUser}
        userStat={selectedUserStat}
        weekSlices={detailWeekSlices}
        entryMap={entryMap}
        projectMap={projectMap}
        selectedMonthLabel={detailMonthLabel}
        onExportUserCsv={exportUserCsv}
        onExportUserPennylane={exportUserPennylane}
      />
    </div>
  )
}

