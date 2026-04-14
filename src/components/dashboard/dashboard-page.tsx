import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Clock,
  CalendarCheck,
  Palmtree,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { addWeeks, startOfYear, endOfWeek, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { User, TimeEntry, Project } from '@repo/shared'
import {
  ABSENCE_TYPES,
  toDateKey,
  getIsoWeek,
  getIsoWeekYear,
  getIsoWeekMonday,
  weekTargetHours,
  countWorkdays,
  parseDateKey,
  sumHours,
  parseDuration,
} from '@repo/shared'
import { api } from '~/lib/api'
import { WeekHoursStatusBadge } from '~/components/shared/app-badges'
import { KpiCard } from '~/components/shared/kpi-card'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { Skeleton } from '~/components/ui/skeleton'
import { Separator } from '~/components/ui/separator'
import { ScrollArea } from '~/components/ui/scroll-area'
import { ChartAreaInteractive } from './chart-area-interactive'
import { cn, formatHoursLabel } from '~/lib/utils'
import { usePageData } from '~/hooks/use-page-data'
import { useProjects } from '~/hooks/use-app-data'

interface DashboardPageProps {
  user: User
}

export function DashboardPage({ user }: DashboardPageProps) {
  const navigate = useNavigate()

  const now = new Date()
  const yearStart = toDateKey(startOfYear(now))
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const isoWeek = getIsoWeek(now)
  const isoYear = getIsoWeekYear(now)
  const currentTarget = weekTargetHours(isoYear, isoWeek)

  const { data, loading } = usePageData(
    async () => {
      const [entries, absences] = await Promise.all([
        api.timeEntries.list(user.id, yearStart, toDateKey(weekEnd)),
        api.absenceRequests.list({ userId: user.id }),
      ])
      return { entries, absences }
    },
    [user.id],
  )

  const entries = data?.entries ?? []
  const absences = data?.absences ?? []
  const projects = useProjects()

  const projectMap = useMemo(() => {
    const m = new Map<string, Project>()
    projects.forEach((p) => m.set(p.id, p))
    return m
  }, [projects])

  const totalHours = useMemo(
    () => sumHours(entries),
    [entries],
  )

  // Semaines complètes depuis début d'année
  const completedWeeks = useMemo(() => {
    const weekMap = new Map<string, number>()
    entries.forEach((e) => {
      const d = new Date(e.workDate + 'T00:00:00')
      const w = getIsoWeek(d)
      const y = getIsoWeekYear(d)
      const key = `${y}-${w}`
      weekMap.set(key, (weekMap.get(key) ?? 0) + parseDuration(e.duration))
    })
    let count = 0
    weekMap.forEach((hours, key) => {
      const [y, w] = key.split('-').map(Number)
      if (hours >= weekTargetHours(y, w)) count++
    })
    return count
  }, [entries])

  const totalWeeks = isoWeek

  // Absences personnelles
  const pendingAbsences = absences.filter((a) => a.status === 'en_attente')
  const approvedCount = absences.filter((a) => a.status === 'approuvee').length

  // Solde CP
  const leaveQuota = Number(user.leaveQuota ?? 25)
  const approvedCPDays = useMemo(() => {
    return absences
      .filter(
        (a) =>
          a.type === 'conges_payes' &&
          a.status === 'approuvee' &&
          a.startDate >= yearStart,
      )
      .reduce((s, a) => {
        return s + countWorkdays(new Date(a.startDate + 'T00:00:00'), new Date(a.endDate + 'T00:00:00'))
      }, 0)
  }, [absences, yearStart])
  const remainingCP = Math.max(0, leaveQuota - approvedCPDays)

  // Semaine courante
  const monday = getIsoWeekMonday(isoYear, isoWeek)
  const mondayKey = toDateKey(monday)
  const currentWeekEntries = entries.filter(
    (e) => e.workDate >= mondayKey && e.workDate <= toDateKey(weekEnd),
  )
  const currentWeekHours = sumHours(currentWeekEntries)

  // Dernières 4 semaines
  const last4Weeks = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const d = addWeeks(now, -(3 - i))
      const y = getIsoWeekYear(d)
      const w = getIsoWeek(d)
      const mon = getIsoWeekMonday(y, w)
      const fri = new Date(mon)
      fri.setDate(mon.getDate() + 4)
      const monKey = toDateKey(mon)
      const friKey = toDateKey(fri)
      const weekEntries = entries.filter((e) => e.workDate >= monKey && e.workDate <= friKey)
      const hours = sumHours(weekEntries)
      const target = weekTargetHours(y, w)
      return { year: y, week: w, hours, target }
    })
  }, [entries])

  // Heures par projet (semaine courante)
  const hoursByProject = useMemo(() => {
    const m = new Map<string, { project: Project; hours: number }>()
    currentWeekEntries.forEach((e) => {
      const proj = projectMap.get(e.projectId)
      if (!proj) return
      const ex = m.get(e.projectId) ?? { project: proj, hours: 0 }
      ex.hours += parseDuration(e.duration)
      m.set(e.projectId, ex)
    })
    return Array.from(m.values()).sort((a, b) => b.hours - a.hours)
  }, [currentWeekEntries, projectMap])

  return (
    <ScrollArea className="min-h-0 flex-1">
    <div className="flex flex-col gap-3 p-4">
      {/* Row 1 — 4 KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <KpiCard
          label="Heures cumulées (année)"
          value={loading ? '' : formatHoursLabel(totalHours)}

          progress={Math.min(100, (totalHours / Math.max(isoWeek * currentTarget, 1)) * 100)}
          colorClass="[&>div]:bg-blue-500"
          hint={`Objectif indicatif ${isoWeek * currentTarget}h`}
          loading={loading}
          icon={Clock}
        />
        <KpiCard
          label="Semaines complètes"
          value={loading ? '' : completedWeeks}
          suffix={`/ ${totalWeeks}`}
          progress={totalWeeks > 0 ? (completedWeeks / totalWeeks) * 100 : 0}
          colorClass="[&>div]:bg-emerald-500"
          hint={`Courante : S${isoWeek}`}
          loading={loading}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Absences"
          value={loading ? '' : pendingAbsences.length}
          suffix="en attente"
          hint={`${approvedCount} approuv.`}
          loading={loading}
          icon={AlertCircle}
        />
        <KpiCard
          label="Congés payés"
          value={loading ? '' : remainingCP}
          suffix={`j / ${leaveQuota}j`}
          progress={leaveQuota > 0 ? (approvedCPDays / leaveQuota) * 100 : 0}
          colorClass="[&>div]:bg-violet-500"
          hint={`${approvedCPDays}j utilisés`}
          loading={loading}
          icon={Palmtree}
        />
      </div>

      {/* Row 2 — Chart */}
      {loading ? (
        <Skeleton className="h-50 w-full rounded-xl" />
      ) : (
        <ChartAreaInteractive entries={entries} weeksBack={8} />
      )}

      {/* Row 3 — Aperçu hebdomadaire + Demandes en attente */}
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-2 gap-2">
        {/* Aperçu hebdomadaire */}
        <Card
          className="group cursor-pointer gap-0 border border-border py-0 shadow-sm transition-colors hover:border-primary/40"
          onClick={() => navigate({ to: '/pointage' })}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="app-kpi-label">Aperçu hebdomadaire</span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="space-y-1.5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))
              ) : (
                last4Weeks.map((w) => {
                  const pct = w.target > 0 ? (w.hours / w.target) * 100 : 0
                  const isComplete = w.hours >= w.target
                  return (
                    <div key={`${w.year}-${w.week}`} className="flex items-center gap-2">
                      <span className="w-8 shrink-0 text-xs font-medium tabular-nums text-foreground">
                        S{w.week}
                      </span>
                      <span className="w-18 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {formatHoursLabel(w.hours)}/{w.target}h
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isComplete ? 'bg-emerald-500' : 'bg-amber-500',
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <WeekHoursStatusBadge
                        hours={w.hours}
                        target={w.target}
                        className="max-w-24 shrink-0 truncate"
                      />
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demandes en attente */}
        <Card
          className="group cursor-pointer gap-0 border border-border py-0 shadow-sm transition-colors hover:border-primary/40"
          onClick={() => navigate({ to: '/absences' })}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="app-kpi-label">Demandes en attente</span>
              <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : pendingAbsences.length > 0 ? (
              <>
                <div className="divide-y divide-border rounded-md border border-border">
                  {pendingAbsences.slice(0, 4).map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-2 py-1.5"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {ABSENCE_TYPES[a.type]}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {format(parseDateKey(a.startDate), 'd MMM', { locale: fr })} →{' '}
                        {format(parseDateKey(a.endDate), 'd MMM', { locale: fr })} ·{' '}
                        {countWorkdays(parseDateKey(a.startDate), parseDateKey(a.endDate))}j
                      </span>
                    </div>
                  ))}
                </div>
                {pendingAbsences.length > 4 && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    +{pendingAbsences.length - 4}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Rien en attente.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Heures par projet + Actions rapides */}
      <div className="grid grid-cols-1 items-stretch lg:grid-cols-2 gap-2">
        {/* Heures par projet */}
        <Card className="gap-0 border border-border py-0 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <span className="app-kpi-label">Heures par projet — semaine courante</span>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))
            ) : hoursByProject.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune heure cette semaine.</p>
            ) : (
              <>
                {hoursByProject.map(({ project, hours }) => (
                  <div key={project.id}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{formatHoursLabel(hours)}</span>
                    </div>
                    <Progress
                      value={currentTarget > 0 ? Math.min(100, (hours / currentTarget) * 100) : 0}
                      className="h-1 bg-muted"
                    />
                  </div>
                ))}
                <Separator className="my-1" />
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-foreground">Total</span>
                  <span className="tabular-nums text-foreground">{formatHoursLabel(currentWeekHours)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card className="gap-0 border border-border py-0 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <span className="app-kpi-label">Actions rapides</span>
            <Button
              variant="outline"
              className="h-auto min-h-0 w-full justify-start gap-2 border-border px-2 py-2 text-left font-normal hover:bg-muted/60"
              onClick={() => navigate({ to: '/pointage' })}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Clock className="size-3.5 text-foreground" />
              </span>
              <span className="min-w-0 flex-1 text-xs font-medium text-foreground">
                Saisir mes heures
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-0 w-full justify-start gap-2 border-border px-2 py-2 text-left font-normal hover:bg-muted/60"
              onClick={() => navigate({ to: '/absences' })}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <CalendarCheck className="size-3.5 text-foreground" />
              </span>
              <span className="min-w-0 flex-1 text-xs font-medium text-foreground">
                Nouvelle absence
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </ScrollArea>
  )
}
