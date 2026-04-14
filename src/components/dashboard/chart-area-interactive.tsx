import { useMemo, useState, useEffect, useId } from 'react'
import { addWeeks } from 'date-fns'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { TimeEntry } from '@repo/shared'
import { getIsoWeek, getIsoWeekYear, getIsoWeekMonday, weekTargetHours, toDateKey, sumHours } from '@repo/shared'
import { useIsMobile } from '~/hooks/use-mobile'
import { Card, CardContent } from '~/components/ui/card'
import { uiDensity } from '~/lib/ui-density'
import { cn } from '~/lib/utils'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'

type WeekHoursRange = 'all' | '8w' | '4w' | '1w'

const RANGE_LABELS: Record<WeekHoursRange, string> = {
  all: 'Toutes les semaines',
  '8w': '8 dernières',
  '4w': '4 dernières',
  '1w': 'Dernière semaine',
}

const chartConfig = {
  saisi: { label: 'Heures saisies', color: 'var(--color-chart-1)' },
  cible: { label: 'Objectif', color: 'var(--color-chart-2)' },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  entries: TimeEntry[]
  weeksBack?: number
}

export function ChartAreaInteractive({ entries, weeksBack = 8 }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = useState<WeekHoursRange>('all')
  const uid = useId().replace(/:/g, '')
  const today = new Date()

  useEffect(() => {
    if (isMobile) setTimeRange('4w')
  }, [isMobile])

  const allPoints = useMemo(() => {
    const points = []
    for (let i = weeksBack - 1; i >= 0; i--) {
      const d = addWeeks(today, -i)
      const year = getIsoWeekYear(d)
      const week = getIsoWeek(d)
      const monday = getIsoWeekMonday(year, week)
      const friday = new Date(monday)
      friday.setDate(monday.getDate() + 4)
      const mondayKey = toDateKey(monday)
      const fridayKey = toDateKey(friday)
      const weekEntries = entries.filter((e) => e.workDate >= mondayKey && e.workDate <= fridayKey)
      const hours = sumHours(weekEntries)
      points.push({
        label: `S${week}`,
        year,
        saisi: Math.round(hours * 10) / 10,
        cible: weekTargetHours(year, week),
      })
    }
    return points
  }, [entries, weeksBack])

  const points = useMemo(() => {
    if (timeRange === 'all') return allPoints
    const n = timeRange === '8w' ? 8 : timeRange === '4w' ? 4 : 1
    return allPoints.slice(-n)
  }, [allPoints, timeRange])

  const yDomain = useMemo((): [number, number] => {
    if (points.length === 0) return [0, 40]
    let max = 0
    for (const p of points) max = Math.max(max, p.saisi, p.cible)
    if (max <= 40) return [0, 40]
    const top = Math.ceil((max + 2) / 5) * 5
    return [0, Math.max(top, 45)]
  }, [points])

  const onRangeChange = (v: string) => {
    if (v === 'all' || v === '8w' || v === '4w' || v === '1w') setTimeRange(v)
  }

  return (
    <Card className="@container/card gap-0 border border-border py-0 shadow-sm">
      <CardContent className={cn(uiDensity.cardPad, 'space-y-3')}>
        <div className="flex flex-col gap-2 @[767px]/card:flex-row @[767px]/card:items-start @[767px]/card:justify-between">
          <div className="min-w-0 space-y-1">
            <span className={uiDensity.kpiLabel}>Heures par semaine</span>
            <p className={uiDensity.kpiHint}>
              <span className="hidden @[540px]/card:block">Saisi vs objectif</span>
              <span className="@[540px]/card:hidden">Saisi vs objectif</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={(v) => v && onRangeChange(v)}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:!px-3 @[767px]/card:flex"
            >
              <ToggleGroupItem value="all">Toutes</ToggleGroupItem>
              <ToggleGroupItem value="8w">8 sem.</ToggleGroupItem>
              <ToggleGroupItem value="4w">4 sem.</ToggleGroupItem>
              <ToggleGroupItem value="1w">1 sem.</ToggleGroupItem>
            </ToggleGroup>
            <Select value={timeRange} onValueChange={onRangeChange}>
              <SelectTrigger className="h-8 w-[min(100%,11rem)] text-xs @[767px]/card:hidden" aria-label="Période du graphique">
                <SelectValue placeholder={RANGE_LABELS.all} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {(Object.keys(RANGE_LABELS) as WeekHoursRange[]).map((key) => (
                  <SelectItem key={key} value={key} className="rounded-lg text-xs">
                    {RANGE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          {points.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Aucune donnée de semaine.</p>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full [&_.recharts-cartesian-axis-tick_text]:text-[10px]"
            >
              <AreaChart data={points} margin={{ left: 2, right: 2, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fillSaisi-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-saisi)" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="var(--color-saisi)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id={`fillCible-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-cible)" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="var(--color-cible)" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <YAxis
                  domain={yDomain}
                  width={32}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  ticks={yDomain[1] <= 40 ? [0, 20, 35, 40] : undefined}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  minTickGap={16}
                  height={28}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value, payload) => {
                        const row = payload?.[0]?.payload as { label?: string; year?: number } | undefined
                        return row?.year != null ? `${row.label} (${row.year})` : String(value)
                      }}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="cible"
                  type="monotone"
                  fill={`url(#fillCible-${uid})`}
                  stroke="var(--color-cible)"
                  strokeWidth={1.5}
                />
                <Area
                  dataKey="saisi"
                  type="monotone"
                  fill={`url(#fillSaisi-${uid})`}
                  stroke="var(--color-saisi)"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
