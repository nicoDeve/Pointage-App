import { format, startOfMonth, startOfYear, getYear } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'

interface SupportPeriodPickerProps {
  selectedMonth: Date
  onSelectMonth: (month: Date, monthId: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupportPeriodPicker({
  selectedMonth,
  onSelectMonth,
  open,
  onOpenChange,
}: SupportPeriodPickerProps) {
  const currentYear = getYear(new Date())
  const selectedYear = getYear(selectedMonth)

  const years = useMemo(() => {
    const list: { year: number; isCurrent: boolean }[] = []
    for (let y = currentYear + 1; y >= currentYear - 2; y--) {
      list.push({ year: y, isCurrent: y === currentYear })
    }
    return list
  }, [currentYear])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 sm:h-9">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">{selectedYear}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 border border-border/50 p-0 shadow-lg" align="start">
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Année</span>
        </div>
        <div className="p-2 space-y-0.5">
          {years.map((y) => (
            <button
              key={y.year}
              type="button"
              onClick={() => {
                const jan = startOfYear(new Date(y.year, 0, 1))
                onSelectMonth(jan, format(jan, 'yyyy-MM'))
                onOpenChange(false)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                y.year === selectedYear && 'bg-muted font-medium',
              )}
            >
              <span>{y.year}</span>
              {y.isCurrent && <span className="shrink-0 text-xs text-muted-foreground">Courant</span>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
