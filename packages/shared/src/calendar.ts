import {
  PUBLIC_HOLIDAYS,
  WEEKLY_OFF_DAYS,
  HOURS_PER_WORKDAY,
} from './calendar-config'

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isWeeklyOff(d: Date): boolean {
  return WEEKLY_OFF_DAYS.includes(d.getDay())
}

export function isPublicHoliday(dateKey: string): boolean {
  return dateKey in PUBLIC_HOLIDAYS
}

export function getHolidayLabel(dateKey: string): string | undefined {
  return PUBLIC_HOLIDAYS[dateKey]
}

export function isWorkday(d: Date): boolean {
  return !isWeeklyOff(d) && !isPublicHoliday(toDateKey(d))
}

export function countWorkdays(start: Date, end: Date): number {
  const a = start <= end ? start : end
  const b = start <= end ? end : start
  let count = 0
  const current = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const last = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  while (current <= last) {
    if (isWorkday(current)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export function listWorkdays(start: Date, end: Date): Date[] {
  const a = start <= end ? start : end
  const b = start <= end ? end : start
  const result: Date[] = []
  const current = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const last = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  while (current <= last) {
    if (isWorkday(current)) result.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return result
}

export function getIsoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getIsoWeekYear(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  return date.getUTCFullYear()
}

export function getIsoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7)
  return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())
}

export function getIsoWeekDays(year: number, week: number): Date[] {
  const monday = getIsoWeekMonday(year, week)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function getIsoWeekWorkdays(year: number, week: number): Date[] {
  return getIsoWeekDays(year, week).filter(isWorkday)
}

export function countIsoWeekWorkdays(year: number, week: number): number {
  return getIsoWeekWorkdays(year, week).length
}

export function weekTargetHours(year: number, week: number): number {
  return countIsoWeekWorkdays(year, week) * HOURS_PER_WORKDAY
}

/**
 * Count workdays in a calendar month (excludes weekends + public holidays).
 * Handles months where the first/last ISO week bleeds into adjacent months —
 * only days within the calendar month are counted.
 */
export function monthWorkdays(year: number, month: number): number {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return countWorkdays(start, end)
}

/**
 * Target working hours for a calendar month.
 * month is 0-indexed (0 = January).
 */
export function monthTargetHours(year: number, month: number): number {
  return monthWorkdays(year, month) * HOURS_PER_WORKDAY
}

/** Parse a duration field (string | number) to a float. */
export function parseDuration(d: string | number): number {
  return typeof d === 'number' ? d : parseFloat(d)
}

/** Sum all durations from an array of objects with a `duration` field. */
export function sumHours(entries: { duration: string | number }[]): number {
  return entries.reduce((s, e) => s + parseDuration(e.duration), 0)
}
