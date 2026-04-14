import { useState, useMemo, useCallback } from 'react'
import type { DateRange } from 'react-day-picker'
import type { AbsenceType, AbsenceRequest } from '@repo/shared'
import { ABSENCE_TYPES, ABSENCE_TYPE_COLORS, PUBLIC_HOLIDAYS, countWorkdays, isPublicHoliday, isWeeklyOff, HOURS_PER_WORKDAY, toDateKey, parseDateKey } from '@repo/shared'
import { api } from '~/lib/api'
import { notifyError } from '~/lib/notify'
import { AppSidePanel } from '~/components/shared/app-side-panel'
import { DateRangePicker } from '~/components/shared/date-range-picker'
import { InlineHelp } from '~/components/shared/inline-help'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

interface AbsenceFormPanelProps {
  open: boolean
  onClose: () => void
  userId: string
  existingAbsences?: AbsenceRequest[]
  onCreated: () => void
}

export function AbsenceFormPanel({ open, onClose, userId, existingAbsences = [], onCreated }: AbsenceFormPanelProps) {
  const [type, setType] = useState<AbsenceType>('conges_payes')
  const [range, setRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [halfDay, setHalfDay] = useState(false)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const workdayCount = useMemo(() => {
    if (!range.from) return 0
    const end = range.to ?? range.from
    const count = countWorkdays(range.from, end)
    return halfDay ? count - 0.5 : count
  }, [range, halfDay])

  const hoursEquivalent = workdayCount * HOURS_PER_WORKDAY

  // Build set of date keys already covered by approved or pending absences
  const { bookedDateKeys, approvedDates, pendingDates } = useMemo(() => {
    const keys = new Set<string>()
    const approved: Date[] = []
    const pending: Date[] = []
    for (const a of existingAbsences) {
      if (a.status === 'refusee') continue
      const start = parseDateKey(a.startDate)
      const end = parseDateKey(a.endDate)
      const cursor = new Date(start)
      while (cursor <= end) {
        const k = toDateKey(cursor)
        keys.add(k)
        // Only show dots on workdays (skip weekends & holidays)
        if (!isWeeklyOff(cursor) && !isPublicHoliday(k)) {
          if (a.status === 'approuvee') approved.push(new Date(cursor))
          else pending.push(new Date(cursor))
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return { bookedDateKeys: keys, approvedDates: approved, pendingDates: pending }
  }, [existingAbsences])

  // Date arrays for calendar dot modifiers
  const holidayDates = useMemo(
    () => Object.keys(PUBLIC_HOLIDAYS).map(parseDateKey),
    [],
  )

  const isDisabledDate = useCallback(
    (date: Date) => isWeeklyOff(date) || isPublicHoliday(toDateKey(date)) || bookedDateKeys.has(toDateKey(date)),
    [bookedDateKeys],
  )

  const isValid = !!range.from && workdayCount > 0

  const handleClose = () => {
    setRange({ from: undefined, to: undefined })
    setHalfDay(false)
    setComment('')
    onClose()
  }

  const submit = async () => {
    if (!range.from || !isValid) return
    const startDate = toDateKey(range.from)
    const end = range.to ?? range.from
    const endDate = toDateKey(end)

    if (startDate > endDate) {
      notifyError('La date de début doit être antérieure à la date de fin')
      return
    }

    setSaving(true)
    try {
      await api.absenceRequests.create({
        type,
        startDate,
        endDate,
        halfDay,
        comment: comment.trim() || undefined,
      })
      handleClose()
      onCreated()
    } catch {
      notifyError('Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppSidePanel
      open={open}
      onClose={handleClose}
      title="Demande d'absence"
      description="Remplissez le formulaire. La demande sera soumise à validation."
      width="narrow"
      footer={
        <Button
          variant="outline"
          size="sm"
          onClick={submit}
          disabled={saving || !isValid}
          className="w-full"
        >
          {saving ? 'Envoi…' : 'Enregistrer'}
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        {/* Type */}
        <div className="space-y-1.5">
          <Label className="text-label">Type d&apos;absence</Label>
          <Select value={type} onValueChange={(v) => setType(v as AbsenceType)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ABSENCE_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: ABSENCE_TYPE_COLORS[key as AbsenceType] }}
                    />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-label">Période</Label>
            <InlineHelp>
              Sélectionnez la plage de dates. Les week-ends et jours fériés
              sont automatiquement exclus du décompte.
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full shrink-0 bg-emerald-500" />
              Approuvé
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full shrink-0 bg-amber-400" />
              En attente
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full shrink-0 bg-orange-400" />
              Férié
            </span>
          </div>
            </InlineHelp>
          </div>
          <DateRangePicker
            value={range}
            onChange={setRange}
            disabled={isDisabledDate}
            modifiers={{ approved: approvedDates, pending: pendingDates, holiday: holidayDates }}
            dotColors={{ approved: '#10b981', pending: '#f59e0b', holiday: '#f97316' }}
            startPlaceholder="Début"
            endPlaceholder="Fin"
          />
        </div>

        {/* Demi-journée */}
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={halfDay}
              onCheckedChange={(c) => setHalfDay(c === true)}
              id="half-day"
            />
            <label htmlFor="half-day" className="text-sm cursor-pointer">
              Demi-journée
            </label>
            <InlineHelp>
              Cochez si votre absence couvre uniquement la matinée ou l&apos;après-midi
              du premier ou dernier jour. 0,5 jour sera déduit du décompte.
            </InlineHelp>
          </div>
        </div>

        {/* Summary box */}
        {range.from && (
          <div className="app-summary-box space-y-1.5">
            <div className="app-summary-row">
              <span className="app-summary-label">Jours ouvrés</span>
              <span className="app-summary-value">{workdayCount}j</span>
            </div>
            <div className="app-summary-row">
              <span className="app-summary-label">Équivalent heures</span>
              <span className="app-summary-value-muted">{hoursEquivalent}h</span>
            </div>
          </div>
        )}

        {/* Motif */}
        <div className="space-y-1.5">
          <Label className="text-label">Motif (optionnel)</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Précisez le motif de votre demande…"
            className="min-h-22 resize-none text-xs"
          />
        </div>

        {/* Process hint */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <InlineHelp>
            Votre demande sera transmise à votre validateur. Vous serez notifié(e) par
            e-mail lors de la décision. Un validateur ne peut pas approuver ses propres
            demandes.
          </InlineHelp>
          <span>Processus de validation</span>
        </div>
      </div>
    </AppSidePanel>
  )
}
