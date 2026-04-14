import { cn } from '~/lib/utils'

interface NotificationCountPingProps {
  count: number
  variant?: 'destructive' | 'primary'
  /** Si true: animation ping halo (plus visible). Sinon: bloom doux (défaut). */
  ambientHalo?: boolean
}

export function NotificationCountPing({
  count,
  variant = 'destructive',
  ambientHalo = false,
}: NotificationCountPingProps) {
  if (count <= 0) return null

  const label = count > 9 ? '9+' : String(count)

  const pingColor =
    variant === 'destructive'
      ? 'oklch(0.577 0.245 27.325)'
      : 'oklch(0.205 0 0)'

  return (
    <span className="relative inline-flex items-center justify-center">
      {/* bloom / halo animé derrière le badge */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-full',
          ambientHalo ? 'notification-ping-halo' : 'notification-badge-bloom',
        )}
        style={{ '--ping-color': pingColor } as React.CSSProperties}
      />
      <span
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full text-[10px] font-medium leading-none text-white tabular-nums',
          count > 9 ? 'h-5 min-w-5 px-1' : 'h-5 w-5',
          variant === 'destructive' ? 'bg-destructive' : 'bg-primary',
        )}
      >
        {label}
      </span>
    </span>
  )
}
