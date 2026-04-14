import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronUp, ChevronDown, ChevronRight, Users, Briefcase,
} from 'lucide-react'
import type { User, TimeEntry, Project } from '@repo/shared'
import { toDateKey, HOURS_PER_WORKDAY, isPublicHoliday, parseDuration } from '@repo/shared'
import { cn, getUserName, getUserInitials, dayHoursTextClass, formatHoursLabel } from '~/lib/utils'
import { sidePanelTokens } from '~/lib/side-panel-tokens'
import { AppSidePanel } from '~/components/shared/app-side-panel'
import { CompletionStatusBadge, getCompletionStatus } from '~/components/shared/app-badges'
import { Badge } from '~/components/ui/badge'
import { Progress } from '~/components/ui/progress'
import { Separator } from '~/components/ui/separator'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Card, CardContent } from '~/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { ExportMenu } from '~/components/shared/export-menu'
import type { DetailTab, WeekSlice, UserStat } from './support-types'
import { getUserHoursForDate, PROJECT_COLORS } from './support-types'

interface SupportDetailPanelProps {
  open: boolean
  onClose: () => void
  selectedUser: User | null
  userStat: UserStat | null
  weekSlices: WeekSlice[]
  entryMap: Map<string, TimeEntry[]>
  projectMap: Map<string, Project>
  selectedMonthLabel: string
  onExportUserCsv: (userId: string) => void
  onExportUserPennylane: (userId: string) => void
}

export function SupportDetailPanel({
  open,
  onClose,
  selectedUser,
  userStat,
  weekSlices,
  entryMap,
  projectMap,
  selectedMonthLabel,
  onExportUserCsv,
  onExportUserPennylane,
}: SupportDetailPanelProps) {
  const [detailTab, setDetailTab] = useState<DetailTab>('weekly')
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const toggleWeek = (wn: number) =>
    setExpandedWeeks((prev) => {
      const n = new Set(prev)
      n.has(wn) ? n.delete(wn) : n.add(wn)
      return n
    })

  const toggleDay = (key: string) =>
    setExpandedDays((prev) => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })

  const userId = selectedUser?.id ?? null

  const weekData = userId
    ? weekSlices.map((slice) => {
        const hours = slice.workdaysInMonth.reduce(
          (s, d) => s + getUserHoursForDate(userId, toDateKey(d), entryMap),
          0,
        )
        const target = slice.workdaysInMonth.length * HOURS_PER_WORKDAY
        return { slice, hours, target, isComplete: hours >= target }
      })
    : []

  const sheetTotal = weekData.reduce((s, w) => s + w.hours, 0)
  const sheetTarget = weekData.reduce((s, w) => s + w.target, 0)

  const detailTitle = selectedUser ? (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-muted text-xs text-muted-foreground">
          {getUserInitials(selectedUser)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{getUserName(selectedUser)}</span>
    </div>
  ) : '—'

  return (
    <AppSidePanel
      open={open}
      onClose={onClose}
      width="wide"
      title={detailTitle}
      description={selectedUser?.poste ?? undefined}
    >
      <div className="space-y-3">
        {/* Tab switcher */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
          <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as DetailTab)}>
            <TabsList className="h-8">
              <TabsTrigger value="weekly" className="px-2.5 text-xs">Hebdomadaire</TabsTrigger>
              <TabsTrigger value="profile" className="px-2.5 text-xs">Profil</TabsTrigger>
            </TabsList>
          </Tabs>
          {userId && (
            <ExportMenu
              onExportCsv={() => onExportUserCsv(userId)}
              onExportPennylane={() => onExportUserPennylane(userId)}
            />
          )}
        </div>

        {/* Weekly tab */}
        {detailTab === 'weekly' && userId && (() => {
          const allComplete = weekData.every((w) => w.isComplete)
          const sc = allComplete ? 'complet' as const : 'incomplet' as const
          return (
            <>
              <div className={cn(sidePanelTokens.summaryBox, 'flex items-center justify-between')}>
                <div>
                  <p className={cn(sidePanelTokens.summaryLabel, 'mb-1')}>{selectedMonthLabel}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="app-kpi-value">{formatHoursLabel(sheetTotal)}</span>
                    <span className="text-xs text-muted-foreground">/ {sheetTarget}h</span>
                  </div>
                  <Progress
                    value={Math.min((sheetTotal / Math.max(sheetTarget, 1)) * 100, 100)}
                    className="mt-2 h-1.5 w-40 bg-muted [&>div]:bg-blue-500"
                  />
                </div>
                <CompletionStatusBadge status={sc} />
              </div>

              <div className="space-y-1.5">
                <p className="app-section-title uppercase tracking-wider text-muted-foreground">Détail par semaine</p>
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {weekData.map(({ slice, hours, target, isComplete: wComplete }) => {
                    const isExpanded = expandedWeeks.has(slice.isoWeek)
                    const wStatus = getCompletionStatus(hours, target)
                    const wLabel = wComplete ? 'Complet' : hours > 0 ? 'Incomplet' : 'Vide'
                    return (
                      <div key={slice.isoWeek}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                          onClick={() => toggleWeek(slice.isoWeek)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 text-xs font-semibold text-foreground">S{slice.isoWeek}</span>
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn('h-full rounded-full', wComplete ? 'bg-green-500' : hours > 0 ? 'bg-yellow-500' : 'bg-red-500')}
                                style={{ width: `${Math.min((hours / Math.max(target, 1)) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-foreground">{formatHoursLabel(hours)}</span>
                            <span className="text-[11px] text-muted-foreground">/ {target}h</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CompletionStatusBadge status={wStatus} label={wLabel} />
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="divide-y divide-border/60 border-t border-border bg-muted/10">
                            {slice.workdaysInMonth.map((d) => {
                              const dateKey = toDateKey(d)
                              const dayKey = `${slice.isoWeek}-${dateKey}`
                              const isDayOpen = expandedDays.has(dayKey)
                              const h = getUserHoursForDate(userId, dateKey, entryMap)
                              const isHoliday = isPublicHoliday(dateKey)
                              const dayEntries = entryMap.get(`${userId}:${dateKey}`) ?? []

                              return (
                                <div key={dayKey}>
                                  <button
                                    type="button"
                                    className={cn(
                                      'flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors',
                                      h > 0 && !isHoliday ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default',
                                    )}
                                    onClick={() => h > 0 && !isHoliday && toggleDay(dayKey)}
                                    disabled={h === 0 || isHoliday}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="w-24 shrink-0 text-xs font-medium capitalize text-muted-foreground">
                                        {format(d, 'EEEE d MMM', { locale: fr })}
                                      </span>
                                      {isHoliday ? (
                                        <Badge className="bg-muted text-xs font-normal text-muted-foreground hover:bg-muted">
                                          Férié
                                        </Badge>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                                            <div
                                              className={cn(
                                                'h-full rounded-full',
                                                h >= HOURS_PER_WORKDAY ? 'bg-green-500' : h > 0 ? 'bg-yellow-500' : 'bg-red-500',
                                              )}
                                              style={{ width: `${Math.min(100, (h / HOURS_PER_WORKDAY) * 100)}%` }}
                                            />
                                          </div>
                                          <span className={cn('text-xs font-medium', dayHoursTextClass(h))}>
                                            {h > 0 ? formatHoursLabel(h) : '—'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {h > 0 && !isHoliday && (
                                      isDayOpen ? (
                                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                      )
                                    )}
                                  </button>

                                  {isDayOpen && dayEntries.length > 0 && (
                                    <div className="space-y-1.5 border-t border-border/60 bg-muted/20 px-4 py-2">
                                      {dayEntries.map((entry, ei) => {
                                        const proj = projectMap.get(entry.projectId)
                                        return (
                                          <div key={entry.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className="h-2 w-2 shrink-0 rounded-sm"
                                                style={{ backgroundColor: proj?.color ?? PROJECT_COLORS[ei % PROJECT_COLORS.length] }}
                                              />
                                              <span className="text-xs text-foreground">{proj?.name ?? '—'}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatHoursLabel(parseDuration(entry.duration))}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />
              <button
                type="button"
                onClick={() => setDetailTab('profile')}
                className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                Voir le profil de {selectedUser ? getUserName(selectedUser).split(' ')[0] : ''}
              </button>
            </>
          )
        })()}

        {/* Profile tab */}
        {detailTab === 'profile' && userStat && selectedUser && (() => {
          const { total, isComplete, byProject } = userStat

          return (
            <>
              <Card className="border border-border">
                <CardContent className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Ressources</span>
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-0.5 text-[11px] text-muted-foreground">Projets actifs</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold tabular-nums text-foreground">{byProject.size}</span>
                        <span className="text-[11px] text-muted-foreground">en cours</span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {[...byProject.keys()].slice(0, 2).map((pid, i) => {
                          const proj = projectMap.get(pid)
                          return (
                            <div key={pid} className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: proj?.color ?? PROJECT_COLORS[i] }} />
                              <span className="max-w-[90px] truncate text-[11px] text-muted-foreground">{proj?.name ?? '—'}</span>
                            </div>
                          )
                        })}
                        {byProject.size > 2 && (
                          <span className="text-[11px] text-muted-foreground">+{byProject.size - 2} autres</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="mb-0.5 text-[11px] text-muted-foreground">Congés restants</p>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-lg font-bold tabular-nums text-violet-600 dark:text-violet-400">
                            {Number(selectedUser.leaveQuota ?? 25)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">j</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Heures par projet</span>
                  </div>
                  <p className="pl-5 text-[11px] text-muted-foreground">Répartition pour {selectedMonthLabel}</p>
                </div>
                <Card className="border border-border">
                  <CardContent className="space-y-2 p-3">
                    {byProject.size === 0 ? (
                      <p className="text-xs text-muted-foreground">Aucune saisie ce mois</p>
                    ) : (
                      <>
                        {[...byProject.entries()]
                          .sort((a, b) => b[1] - a[1])
                          .map(([pid, hours], i) => {
                            const proj = projectMap.get(pid)
                            return (
                              <div key={pid} className="flex items-center justify-between gap-2 text-xs">
                                <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-sm"
                                    style={{ backgroundColor: proj?.color ?? PROJECT_COLORS[i % PROJECT_COLORS.length] }}
                                  />
                                  {proj?.name ?? '—'}
                                </span>
                                <span className="shrink-0 font-semibold tabular-nums">{formatHoursLabel(hours)}</span>
                              </div>
                            )
                          })}
                        <Separator />
                        <div className="flex justify-between text-xs font-medium">
                          <span>Total ({selectedMonthLabel})</span>
                          <span className="tabular-nums">{formatHoursLabel(total)}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-2">
                <span className="text-xs font-medium text-foreground">Informations</span>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Poste</span>
                    <span className="text-foreground">{selectedUser.poste ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heures ce mois</span>
                    <span className="text-foreground">{formatHoursLabel(total)} / {sheetTarget}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Statut</span>
                    <span className={isComplete ? 'text-green-600' : 'text-amber-600'}>
                      {isComplete ? 'Complet' : 'Incomplet'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )
        })()}
      </div>
    </AppSidePanel>
  )
}
