import type { ComponentType } from 'react'
import { Card, CardContent } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
  suffix?: string
  hint?: string
  progress?: number
  indicatorClassName?: string
  loading?: boolean
  icon?: ComponentType<{ className?: string }>
  className?: string
}

export function KpiCard({
  label,
  value,
  unit,
  suffix,
  hint,
  progress,
  indicatorClassName,
  loading = false,
  icon: Icon,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="app-kpi-value">{value}</span>
              {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
              {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
            </div>
            {progress !== undefined && (
              <Progress value={progress} className="h-1 bg-muted" indicatorClassName={indicatorClassName} />
            )}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
