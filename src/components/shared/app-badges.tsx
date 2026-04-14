import { Badge } from '~/components/ui/badge'
import {
  ABSENCE_TYPES,
  ABSENCE_STATUSES,
} from '@repo/shared'
import type { AbsenceType, AbsenceStatus } from '@repo/shared'
import { cn } from '~/lib/utils'

// ─── Absence Type Badge (colored, single source) ────────────────────────────

const ABSENCE_TYPE_BADGE_CSS: Record<AbsenceType, string> = {
  conges_payes: 'bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/40 dark:text-violet-300 border-0',
  teletravail: 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300 border-0',
  maladie: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 border-0',
  sans_solde: 'bg-muted text-muted-foreground hover:bg-muted border-0',
}

interface AbsenceTypeBadgeProps {
  type: AbsenceType
  className?: string
}

export function AbsenceTypeBadge({ type, className }: AbsenceTypeBadgeProps) {
  return (
    <Badge className={cn(ABSENCE_TYPE_BADGE_CSS[type], 'text-xs font-normal', className)}>
      {ABSENCE_TYPES[type]}
    </Badge>
  )
}

// ─── Absence Status Badge ───────────────────────────────────────────────────

interface AbsenceStatusBadgeProps {
  status: AbsenceStatus
  className?: string
}

const ABSENCE_STATUS_BADGE_CSS: Record<AbsenceStatus, string> = {
  approuvee: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 border-0',
  en_attente: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 border-0',
  refusee: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 border-0',
}

export function AbsenceStatusBadge({ status, className }: AbsenceStatusBadgeProps) {
  return (
    <Badge className={cn(ABSENCE_STATUS_BADGE_CSS[status], 'text-xs font-normal', className)}>
      {ABSENCE_STATUSES[status]}
    </Badge>
  )
}

interface WeekHoursStatusBadgeProps {
  hours: number
  target: number
  className?: string
}

export function WeekHoursStatusBadge({ hours, target, className }: WeekHoursStatusBadgeProps) {
  const ratio = target > 0 ? hours / target : 0
  const css = ratio >= 1
    ? 'border-green-500/50 text-green-700 dark:text-green-400'
    : ratio > 0
      ? 'border-yellow-400/50 text-yellow-700 dark:text-yellow-400'
      : 'border-border text-muted-foreground'
  const label = ratio >= 1 ? 'Complet' : ratio > 0 ? `${Math.round(ratio * 100)}%` : '—'
  return (
    <Badge variant="outline" className={cn(css, 'text-xs font-normal', className)}>
      {label}
    </Badge>
  )
}

/** Unified completion status badge — used in support views and pointage */
export type CompletionStatus = 'complet' | 'incomplet' | 'en_retard'

const COMPLETION_STATUS_CSS: Record<CompletionStatus, string> = {
  complet: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 border-0',
  incomplet: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 border-0',
  en_retard: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 border-0',
}

const COMPLETION_STATUS_LABEL: Record<CompletionStatus, string> = {
  complet: 'Complet',
  incomplet: 'Incomplet',
  en_retard: 'En retard',
}

export function getCompletionStatus(hours: number, target: number): CompletionStatus {
  if (hours >= target) return 'complet'
  if (hours > 0) return 'incomplet'
  return 'en_retard'
}

interface CompletionStatusBadgeProps {
  status: CompletionStatus
  label?: string
  className?: string
}

export function CompletionStatusBadge({ status, label, className }: CompletionStatusBadgeProps) {
  return (
    <Badge className={cn(COMPLETION_STATUS_CSS[status], 'text-xs font-normal', className)}>
      {label ?? COMPLETION_STATUS_LABEL[status]}
    </Badge>
  )
}

/** Unified period status badge — "En cours", "Passée", "À venir", etc. */
export type PeriodStatus = 'en_cours' | 'passee' | 'a_venir' | 'a_completer' | 'ferie' | 'archive'

const PERIOD_STATUS_CSS: Record<PeriodStatus, string> = {
  en_cours: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 border-0',
  passee: 'bg-muted text-muted-foreground hover:bg-muted border-0',
  a_venir: 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300 border-0',
  a_completer: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 border-0',
  ferie: 'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 border-0',
  archive: 'bg-muted text-muted-foreground hover:bg-muted border-0',
}

const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  en_cours: 'En cours',
  passee: 'Passée',
  a_venir: 'À venir',
  a_completer: 'À compléter',
  ferie: 'Férié',
  archive: 'Archivé',
}

interface PeriodStatusBadgeProps {
  status: PeriodStatus
  label?: string
  className?: string
}

export function PeriodStatusBadge({ status, label, className }: PeriodStatusBadgeProps) {
  return (
    <Badge className={cn(PERIOD_STATUS_CSS[status], 'text-xs font-normal', className)}>
      {label ?? PERIOD_STATUS_LABEL[status]}
    </Badge>
  )
}
