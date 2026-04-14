import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { User } from '@repo/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUserName(u: User | null | undefined): string {
  if (!u) return 'Utilisateur inconnu'
  return u.name ?? u.poste ?? u.id.slice(0, 8)
}

export function getUserInitials(u: User | null | undefined): string {
  if (!u) return '?'
  if (u.name) {
    return u.name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return u.poste?.slice(0, 2).toUpperCase() ?? '??'
}

/** Day hours text color: green (full), amber (partial), muted (zero) */
export function dayHoursTextClass(hours: number, target = 7) {
  if (hours >= target) return 'text-green-600 dark:text-green-400'
  if (hours > 0) return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}

/** Format hours label: 0 → "0h", 3.5 → "3h30", 7 → "7h", 2.25 → "2h15" */
export function formatHoursLabel(h: number): string {
  if (h === 0) return '0h'
  const full = Math.floor(h)
  const minutes = Math.round((h % 1) * 60)
  return minutes > 0 ? `${full}h${String(minutes).padStart(2, '0')}` : `${full}h`
}
