import { useState } from 'react'
import type { DateRange, Matcher } from 'react-day-picker'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarRange } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Calendar, CalendarDayButton } from '~/components/ui/calendar'
import { Button } from '~/components/ui/button'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  disabled?: Matcher | Matcher[]
  modifiers?: Record<string, Matcher | Matcher[]>
  /** Colored dots rendered below the day number keyed by modifier name */
  dotColors?: Record<string, string>
  defaultMonth?: Date
  align?: 'start' | 'center' | 'end'
  startPlaceholder?: string
  endPlaceholder?: string
}

export function DateRangePicker({
  value,
  onChange,
  disabled,
  modifiers,
  dotColors,
  defaultMonth,
  align = 'start',
  startPlaceholder = 'Début',
  endPlaceholder = 'Fin',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(
    value.from ?? defaultMonth ?? new Date(),
  )

  const formatDate = (d: Date | undefined) =>
    d ? format(d, 'd MMM yyyy', { locale: fr }) : undefined

  const fromLabel = formatDate(value.from) ?? startPlaceholder
  const toLabel = formatDate(value.to) ?? endPlaceholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-9 flex-1 justify-start gap-2 text-left font-normal',
              !value.from && 'text-muted-foreground',
            )}
          >
            {fromLabel}
          </Button>
          <span className="text-muted-foreground/60">—</span>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-9 flex-1 justify-start gap-2 text-left font-normal',
              !value.to && 'text-muted-foreground',
            )}
          >
            {toLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Ouvrir le calendrier"
          >
            <CalendarRange className="size-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => {
            onChange(range ?? { from: undefined, to: undefined })
            if (range?.from) setMonth(range.from)
          }}
          month={month}
          onMonthChange={setMonth}
          disabled={disabled}
          modifiers={modifiers}
          locale={fr}
          numberOfMonths={1}
          components={dotColors ? {
            DayButton: ({ children, ...rest }) => {
              const dots = Object.entries(dotColors).filter(
                ([key]) => (rest.modifiers as Record<string, boolean>)[key],
              )
              return (
                <CalendarDayButton {...rest}>
                  {children}
                  {dots.length > 0 && (
                    <span className="flex items-center justify-center gap-0.5">
                      {dots.map(([key, color]) => (
                        <span
                          key={key}
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  )}
                </CalendarDayButton>
              )
            },
          } : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
