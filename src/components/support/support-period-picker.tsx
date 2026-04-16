import { format, startOfMonth, addMonths, subMonths, getYear } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'

interface SupportPeriodPickerProps {
  selectedMonth: Date
  onSelectMonth: (month: Date, monthId: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function SupportPeriodPicker({
  selectedMonth,
  onSelectMonth,
  open,
  onOpenChange,
}: SupportPeriodPickerProps) {
  const currentYear = getYear(new Date())
  const selectedYear = getYear(selectedMonth)
  const selectedMonthIdx = selectedMonth.getMonth()
  const label = format(selectedMonth, 'MMMM yyyy', { locale: fr })
  const isCurrentMonth =
    selectedYear === getYear(new Date()) &&
    selectedMonthIdx === new Date().getMonth()

  const goPrev = () => {
    const prev = startOfMonth(subMonths(selectedMonth, 1))
    onSelectMonth(prev, format(prev, 'yyyy-MM'))
  }
  const goNext = () => {
    const next = startOfMonth(addMonths(selectedMonth, 1))
    onSelectMonth(next, format(next, 'yyyy-MM'))
  }
  const goToday = () => {
    const now = startOfMonth(new Date())
    onSelectMonth(now, format(now, 'yyyy-MM'))
  }

  const years = useMemo(() => {
    const list: number[] = []
    for (let y = currentYear - 2; y <= currentYear + 1; y++) list.push(y)
    return list
  }, [currentYear])

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 min-w-40 gap-2 capitalize sm:h-9">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 border border-border/50 p-0 shadow-lg" align="start">
          {/* Year tabs */}
          <div className="flex items-center gap-1 border-b border-border bg-muted/50 px-3 py-2">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  const m = startOfMonth(new Date(y, selectedMonthIdx, 1))
                  onSelectMonth(m, format(m, 'yyyy-MM'))
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  y === selectedYear
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {y}
              </button>
            ))}
          </div>
          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1 p-2">
            {MONTHS.map((m, i) => {
              const isCurrent = i === new Date().getMonth() && selectedYear === currentYear
              const isSelected = i === selectedMonthIdx
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const d = startOfMonth(new Date(selectedYear, i, 1))
                    onSelectMonth(d, format(d, 'yyyy-MM'))
                    onOpenChange(false)
                  }}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-xs transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : isCurrent
                        ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-foreground hover:bg-muted',
                  )}
                >
                  {m.slice(0, 4)}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={goToday}>
          Aujourd'hui
        </Button>
      )}
    </div>
  )
}
