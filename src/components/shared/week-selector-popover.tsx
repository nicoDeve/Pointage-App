import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { getIsoWeek, getIsoWeekMonday } from '@repo/shared'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Button } from '~/components/ui/button'
import { ScrollArea } from '~/components/ui/scroll-area'
import { PeriodStatusBadge } from '~/components/shared/app-badges'
import { cn } from '~/lib/utils'

export interface WeekOption {
  year: number
  week: number
}

interface WeekSelectorPopoverProps {
  /** Liste des semaines disponibles (triées) */
  weeks: WeekOption[]
  selected: WeekOption
  onSelect: (week: WeekOption) => void
}

function getWeekLabel(w: WeekOption) {
  const monday = getIsoWeekMonday(w.year, w.week)
  const friday = addDays(monday, 4)
  const start = format(monday, 'd MMM', { locale: fr })
  const end = format(friday, 'd MMM yyyy', { locale: fr })
  return `S${w.week} · ${start} – ${end}`
}

function getWeekStatus(w: WeekOption, currentWeek: number, currentYear: number) {
  if (w.year === currentYear && w.week === currentWeek) return 'current'
  const wDate = getIsoWeekMonday(w.year, w.week)
  const nowDate = getIsoWeekMonday(currentYear, currentWeek)
  return wDate < nowDate ? 'past' : 'future'
}

export function WeekSelectorPopover({
  weeks,
  selected,
  onSelect,
}: WeekSelectorPopoverProps) {
  const [open, setOpen] = useState(false)

  const today = new Date()
  const currentWeek = getIsoWeek(today)
  const currentYear = today.getFullYear()

  const triggerLabel = getWeekLabel(selected)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-full justify-between gap-2 font-normal text-sm"
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(calc(100vw-2rem),22rem)] p-0"
      >
        <div className="bg-muted/20 px-3 py-2.5 border-b border-border">
          <p className="text-xs font-semibold">Sélectionner une semaine</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Semaines avec des entrées de temps
          </p>
        </div>
        <ScrollArea className="h-[min(280px,45vh)]">
          <div className="p-1">
            {weeks.map((w) => {
              const status = getWeekStatus(w, currentWeek, currentYear)
              const isSelected =
                w.week === selected.week && w.year === selected.year
              return (
                <button
                  key={`${w.year}-${w.week}`}
                  type="button"
                  onClick={() => {
                    onSelect(w)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/80',
                  )}
                >
                  <span>
                    <span className="font-medium">Semaine {w.week}</span>
                    <span className="text-muted-foreground text-xs ml-1.5">
                      · {format(getIsoWeekMonday(w.year, w.week), 'd MMM', { locale: fr })} –{' '}
                      {format(addDays(getIsoWeekMonday(w.year, w.week), 4), 'd MMM', { locale: fr })}
                    </span>
                  </span>
                  <PeriodStatusBadge
                    status={status === 'current' ? 'en_cours' : status === 'future' ? 'a_venir' : 'passee'}
                    className="text-[10px] h-5 px-1.5 ml-2 shrink-0"
                  />
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
