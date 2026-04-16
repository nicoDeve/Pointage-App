import { and, eq, ne, sql, between } from 'drizzle-orm'
import { timeEntries } from '~/db/schema'
import { db } from '~/db'
import {
  MAX_HOURS_PER_DAY,
  getIsoWeek,
  getIsoWeekYear,
  getIsoWeekMonday,
  weekTargetHours,
  toDateKey,
} from '@repo/shared'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Validate day + week hour caps inside a Drizzle transaction.
 * Throws a descriptive Error when either cap is exceeded.
 *
 * @param tx        – Drizzle transaction handle
 * @param userId    – owner of the entries
 * @param workDate  – date string (YYYY-MM-DD)
 * @param duration  – hours being added
 * @param excludeId – if updating, exclude this entry from the sums
 */
export async function validateTimeEntryCaps(
  tx: Transaction,
  userId: string,
  workDate: string,
  duration: number,
  excludeId?: string,
) {
  // ── Day cap ────────────────────────────────────────────────
  const dayConditions = [
    eq(timeEntries.userId, userId),
    eq(timeEntries.workDate, workDate),
  ]
  if (excludeId !== undefined) dayConditions.push(ne(timeEntries.id, excludeId))

  const existingDay = await tx
    .select({ total: sql<string>`coalesce(sum(${timeEntries.duration}), '0')` })
    .from(timeEntries)
    .where(and(...dayConditions))

  const dayTotal = parseFloat(existingDay[0]?.total ?? '0') + duration
  if (dayTotal > MAX_HOURS_PER_DAY) {
    throw new Error(
      `Le total journalier (${dayTotal}h) dépasse le maximum de ${MAX_HOURS_PER_DAY}h`,
    )
  }

  // ── Week cap ───────────────────────────────────────────────
  const workDateObj = new Date(workDate + 'T00:00:00')
  const isoWeek = getIsoWeek(workDateObj)
  const isoYear = getIsoWeekYear(workDateObj)
  const weekMonday = getIsoWeekMonday(isoYear, isoWeek)
  const weekSunday = new Date(weekMonday)
  weekSunday.setDate(weekMonday.getDate() + 6)

  const weekConditions = [
    eq(timeEntries.userId, userId),
    between(timeEntries.workDate, toDateKey(weekMonday), toDateKey(weekSunday)),
  ]
  if (excludeId !== undefined) weekConditions.push(ne(timeEntries.id, excludeId))

  const existingWeek = await tx
    .select({ total: sql<string>`coalesce(sum(${timeEntries.duration}), '0')` })
    .from(timeEntries)
    .where(and(...weekConditions))

  const weekTotal = parseFloat(existingWeek[0]?.total ?? '0') + duration
  const weekMax = weekTargetHours(isoYear, isoWeek)
  if (weekTotal > weekMax) {
    throw new Error(
      `Le total de la semaine (${weekTotal}h) dépasserait le maximum de ${weekMax}h`,
    )
  }
}
