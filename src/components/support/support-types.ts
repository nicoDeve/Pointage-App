import { startOfMonth, endOfMonth, startOfYear, addMonths, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { TimeEntry } from '@repo/shared'
import {
  listWorkdays, getIsoWeek, getIsoWeekYear, getIsoWeekWorkdays,
  toDateKey, sumHours, monthTargetHours,
} from '@repo/shared'

// ─── Types ──────────────────────────────────────────────────────────

export type DetailTab = 'weekly' | 'profile'

export interface WeekDay {
  date: Date
  inMonth: boolean
}

export interface WeekSlice {
  isoWeek: number
  isoWeekYear: number
  workdaysInMonth: Date[]
  /** All workdays of the full ISO week, with inMonth flag */
  fullWeekDays: WeekDay[]
}

export interface MonthData {
  month: Date
  id: string
  label: string
  entries: TimeEntry[]
  isCurrent: boolean
}

export interface UserStat {
  user: import('@repo/shared').User
  total: number
  isComplete: boolean
  byProject: Map<string, number>
}

// ─── Pure helpers ───────────────────────────────────────────────────

export function buildWeekSlices(month: Date): WeekSlice[] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const mStart = toDateKey(start)
  const mEnd = toDateKey(end)
  const days = listWorkdays(start, end)

  // Collect unique ISO weeks that touch this month
  const seen = new Set<string>()
  const weekKeys: { wy: number; wn: number }[] = []
  for (const d of days) {
    const wn = getIsoWeek(d)
    const wy = getIsoWeekYear(d)
    const key = `${wy}-${wn}`
    if (!seen.has(key)) {
      seen.add(key)
      weekKeys.push({ wy, wn })
    }
  }

  return weekKeys
    .sort((a, b) => a.wy !== b.wy ? a.wy - b.wy : a.wn - b.wn)
    .map(({ wy, wn }) => {
      const allDays = getIsoWeekWorkdays(wy, wn)
      const fullWeekDays: WeekDay[] = allDays.map((d) => {
        const dk = toDateKey(d)
        return { date: d, inMonth: dk >= mStart && dk <= mEnd }
      })
      const workdaysInMonth = fullWeekDays.filter((wd) => wd.inMonth).map((wd) => wd.date)
      return { isoWeek: wn, isoWeekYear: wy, workdaysInMonth, fullWeekDays }
    })
}

export function getUserHoursForDate(
  userId: string,
  dateKey: string,
  entryMap: Map<string, TimeEntry[]>,
): number {
  return sumHours(entryMap.get(`${userId}:${dateKey}`) ?? [])
}

export function buildMonthRange(selected: Date): Date[] {
  const jan = startOfYear(selected)
  const months: Date[] = []
  for (let i = 0; i < 12; i++) {
    months.push(startOfMonth(addMonths(jan, i)))
  }
  return months
}

export function getMonthStats(
  md: MonthData,
  users: import('@repo/shared').User[],
): { complete: number; total: number } {
  const target = monthTargetHours(md.month.getFullYear(), md.month.getMonth())
  const complete = users.filter((u) => {
    const h = sumHours(md.entries.filter((e) => e.userId === u.id))
    return h >= target
  }).length
  return { complete, total: users.length }
}

export const PROJECT_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981']
