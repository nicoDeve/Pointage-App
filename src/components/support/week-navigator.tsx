import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import type { WeekSlice } from './support-types'

interface WeekNavigatorProps {
  slices: WeekSlice[]
  currentIndex: number
  onChangeIndex: (index: number) => void
}

export function WeekNavigator({ slices, currentIndex, onChangeIndex }: WeekNavigatorProps) {
  const slice = slices[currentIndex]
  if (!slice) return null

  const days = slice.workdaysInMonth
  const first = days[0]
  const last = days[days.length - 1]

  const rangeLabel = first && last
    ? `${format(first, 'd MMM', { locale: fr })} – ${format(last, 'd MMM', { locale: fr })}`
    : '—'

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={currentIndex <= 0}
        onClick={() => onChangeIndex(currentIndex - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 px-2">
        <span className="font-semibold text-foreground">S{slice.isoWeek}</span>
        <span className="text-muted-foreground">{rangeLabel}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={currentIndex >= slices.length - 1}
        onClick={() => onChangeIndex(currentIndex + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
