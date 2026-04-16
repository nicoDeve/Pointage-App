import { useState, useCallback, useMemo } from 'react'
import { addWeeks, addDays, startOfYear, endOfYear } from 'date-fns'
import type { User } from '@repo/shared'
import {
  toDateKey,
  getIsoWeek,
  getIsoWeekYear,
  getIsoWeekMonday,
  HOURS_PER_WORKDAY,
  parseDuration,
  sumHours,
} from '@repo/shared'
import { api } from '~/lib/api'
import { notifySaved, notifyError } from '~/lib/notify'
import { publishToastPing } from '~/lib/toast-ping'
import { useProjects, useAppLoading } from '~/hooks/use-app-data'
import { usePageData } from '~/hooks/use-page-data'
import { ScrollArea } from '~/components/ui/scroll-area'
import { PointageToolbar } from './pointage-toolbar'
import { WeekList } from './week-list'
import { DayView } from './day-view'
import { DayEditPanel } from './day-edit-panel'
import type { WeekOption, DraftEntry } from './pointage-types'

// ─── Component ────────────────────────────────────────────────────────────────

interface PointagePageProps {
  user: User
}

export function PointagePage({ user }: PointagePageProps) {
  const now = useMemo(() => new Date(), [])
  const currentWeek = getIsoWeek(now)
  const currentYear = getIsoWeekYear(now)
  const todayWeek = useMemo<WeekOption>(
    () => ({ year: currentYear, week: currentWeek }),
    [currentYear, currentWeek],
  )

  // ─── Data ─────────────────────────────────────────────────────────
  const projects = useProjects()
  const appLoading = useAppLoading()

  const { data: entries, loading: pageLoading, reload } = usePageData(
    'time-entries',
    () => api.timeEntries.list(
      user.id,
      toDateKey(startOfYear(now)),
      toDateKey(endOfYear(now)),
    ),
    [user.id],
  )
  const loading = pageLoading || appLoading
  const allEntries = entries ?? []

  // ─── View state ───────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'day'>('list')
  const [selectedWeek, setSelectedWeek] = useState<WeekOption>(todayWeek)
  const [search, setSearch] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterProject, setFilterProject] = useState('all')

  // ─── Day panel state ──────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayPanelOpen, setDayPanelOpen] = useState(false)
  const [dayDrafts, setDayDrafts] = useState<DraftEntry[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [savingDay, setSavingDay] = useState(false)

  // ─── Week helpers ─────────────────────────────────────────────────
  const isCurrentWeek = useCallback(
    (w: WeekOption) => w.week === currentWeek && w.year === currentYear,
    [currentWeek, currentYear],
  )
  const isPastWeek = useCallback(
    (w: WeekOption) => getIsoWeekMonday(w.year, w.week) < getIsoWeekMonday(currentYear, currentWeek),
    [currentYear, currentWeek],
  )

  const getWeekEntries = useCallback((w: WeekOption) => {
    const monday = getIsoWeekMonday(w.year, w.week)
    const fri = addDays(monday, 4)
    const mKey = toDateKey(monday)
    const fKey = toDateKey(fri)
    return allEntries.filter((e) => e.workDate >= mKey && e.workDate <= fKey)
  }, [allEntries])

  const availableWeeks = useMemo((): WeekOption[] => {
    const weekSet = new Set<string>()
    let d = getIsoWeekMonday(todayWeek.year, 1)
    while (getIsoWeekYear(d) === todayWeek.year) {
      weekSet.add(`${getIsoWeekYear(d)}-${getIsoWeek(d)}`)
      d = addWeeks(d, 1)
    }
    allEntries.forEach((e) => {
      const ed = new Date(e.workDate + 'T00:00:00')
      if (getIsoWeekYear(ed) === todayWeek.year) {
        weekSet.add(`${getIsoWeekYear(ed)}-${getIsoWeek(ed)}`)
      }
    })
    return Array.from(weekSet)
      .map((s) => { const [y, w] = s.split('-').map(Number); return { year: y, week: w } })
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.week - b.week)
  }, [allEntries, todayWeek.year])

  const filteredWeeks = useMemo(() => {
    let list = [...availableWeeks]
    if (search) {
      list = list.filter((w) => String(w.week).includes(search) || String(w.year).includes(search))
    }
    if (filterPeriod === 'current') list = list.filter(isCurrentWeek)
    else if (filterPeriod === 'past') list = list.filter((w) => isPastWeek(w) && !isCurrentWeek(w))
    else if (filterPeriod === 'future') list = list.filter((w) => !isPastWeek(w) && !isCurrentWeek(w))
    if (filterProject !== 'all') {
      list = list.filter((w) => getWeekEntries(w).some((e) => e.projectId === filterProject))
    }
    return list.sort((a, b) => (a.year - b.year) || (a.week - b.week))
  }, [availableWeeks, search, filterPeriod, filterProject, getWeekEntries, isCurrentWeek, isPastWeek])

  // Selected week derived data
  const selectedWeekEntries = useMemo(() => getWeekEntries(selectedWeek), [selectedWeek, getWeekEntries])
  const weekTotalHours = useMemo(() => sumHours(selectedWeekEntries), [selectedWeekEntries])

  // ─── Day panel actions ────────────────────────────────────────────
  const openDayPanel = (dateKey: string) => {
    setSelectedDate(dateKey)
    const dayEntries = allEntries.filter((e) => e.workDate === dateKey)
    setDayDrafts(
      dayEntries.length > 0
        ? dayEntries.map((e) => ({
            id: e.id,
            projectId: e.projectId,
            duration: parseDuration(e.duration),
          }))
        : [],
    )
    setDeletedIds([])
    setDayPanelOpen(true)
  }

  const handleDraftChange = (idx: number, field: 'projectId' | 'duration', value: string | number) => {
    setDayDrafts((prev) => prev.map((d, i) =>
      i === idx ? { ...d, [field]: value } : d,
    ))
  }

  const handleDraftRemove = (idx: number) => {
    const draft = dayDrafts[idx]
    if (draft?.id) setDeletedIds((prev) => [...prev, draft.id!])
    setDayDrafts((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleDraftAdd = () => {
    const usedIds = dayDrafts.map((d) => d.projectId)
    const available = projects.filter((p) => !usedIds.includes(p.id))
    if (available.length === 0) return
    const dayTotal = dayDrafts.reduce((s, d) => s + d.duration, 0)
    setDayDrafts((prev) => [
      ...prev,
      { projectId: available[0].id, duration: Math.min(HOURS_PER_WORKDAY - dayTotal, HOURS_PER_WORKDAY) },
    ])
  }

  const handleDaySave = async () => {
    if (!selectedDate) return
    setSavingDay(true)
    try {
      for (const id of deletedIds) await api.timeEntries.delete(id)
      for (const d of dayDrafts) {
        if (d.duration <= 0) continue
        const payload = { projectId: d.projectId, workDate: selectedDate, duration: d.duration }
        if (d.id) await api.timeEntries.update(d.id, payload)
        else await api.timeEntries.create(payload)
      }
      notifySaved('Journée enregistrée')
      publishToastPing('saved')
      reload()
      setDayPanelOpen(false)
    } catch (err) {
      notifyError('Erreur lors de la sauvegarde', err instanceof Error ? err.message : undefined)
    } finally {
      setSavingDay(false)
    }
  }

  const handleSelectWeek = (w: WeekOption) => {
    setSelectedWeek(w)
    setView('day')
  }

  // ─── Render ───────────────────────────────────────────────────────
  if (view === 'day') {
    return (
      <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col gap-3 p-4">
        <DayView
          selectedWeek={selectedWeek}
          entries={selectedWeekEntries}
          projects={projects}
          availableWeeks={availableWeeks}
          loading={loading}
          isCurrent={isCurrentWeek(selectedWeek)}
          isPast={isPastWeek(selectedWeek)}
          onWeekChange={setSelectedWeek}
          onBack={() => setView('list')}
          onDaySelect={openDayPanel}
        />
        <DayEditPanel
          open={dayPanelOpen}
          onClose={() => setDayPanelOpen(false)}
          selectedDate={selectedDate}
          selectedWeek={selectedWeek}
          weekTotalHours={weekTotalHours}
          isPast={isPastWeek(selectedWeek)}
          projects={projects}
          drafts={dayDrafts}
          saving={savingDay}
          onDraftChange={handleDraftChange}
          onDraftRemove={handleDraftRemove}
          onDraftAdd={handleDraftAdd}
          onSave={handleDaySave}
        />
      </div>
      </ScrollArea>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      {/* Sticky toolbar */}
      <PointageToolbar
        search={search}
        onSearchChange={setSearch}
        filterPeriod={filterPeriod}
        onFilterPeriodChange={setFilterPeriod}
        filterProject={filterProject}
        onFilterProjectChange={setFilterProject}
        projects={projects}
      />

      {/* Scrollable week list */}
      <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border">
        <WeekList
          weeks={filteredWeeks}
          projects={projects}
          loading={loading}
          getWeekEntries={getWeekEntries}
          isCurrentWeek={isCurrentWeek}
          isPastWeek={isPastWeek}
          onSelectWeek={handleSelectWeek}
        />
      </ScrollArea>
    </div>
  )
}
