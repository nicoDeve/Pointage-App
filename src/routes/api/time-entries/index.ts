import { createFileRoute } from '@tanstack/react-router'
import { and, eq, between, sql } from 'drizzle-orm'
import { db } from '~/db'
import { timeEntries, projects } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import {
  listTimeEntriesQuerySchema,
  createTimeEntrySchema,
} from '~/lib/validators/time-entries'
import { forbidden, badRequest, safeHandler } from '~/lib/errors'
import {
  MAX_HOURS_PER_DAY,
  getIsoWeek,
  getIsoWeekYear,
  getIsoWeekMonday,
  weekTargetHours,
  toDateKey,
} from '@repo/shared'

export const Route = createFileRoute('/api/time-entries/')({
  server: {
    middleware: [authMiddleware],
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: safeHandler(async ({ request, context }) => {
          const { user } = context as AuthContext
          const url = new URL(request.url)
          const parsed = listTimeEntriesQuerySchema.safeParse(
            Object.fromEntries(url.searchParams),
          )
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten() },
              { status: 400 },
            )
          }

          const { userId, startDate, endDate } = parsed.data

          const isSelf = user.id === userId
          const canViewOthers = user.roles.some((r: string) =>
            ['admin', 'support'].includes(r),
          )
          if (!isSelf && !canViewOthers) {
            return forbidden('Un collaborateur ne peut voir que ses propres saisies')
          }

          const data = await db
            .select({
              id: timeEntries.id,
              userId: timeEntries.userId,
              projectId: timeEntries.projectId,
              workDate: timeEntries.workDate,
              startTime: timeEntries.startTime,
              duration: timeEntries.duration,
              createdAt: timeEntries.createdAt,
              updatedAt: timeEntries.updatedAt,
              projectName: projects.name,
              projectColor: projects.color,
            })
            .from(timeEntries)
            .leftJoin(projects, eq(timeEntries.projectId, projects.id))
            .where(
              and(
                eq(timeEntries.userId, userId),
                between(timeEntries.workDate, startDate, endDate),
              ),
            )
            .orderBy(timeEntries.workDate)

          return Response.json(data)
        }),

        POST: safeHandler(async ({ request, context }) => {
          const { user } = context as AuthContext
          const hasRole = user.roles.some((r: string) =>
            ['collaborateur', 'admin'].includes(r),
          )
          if (!hasRole) {
            return forbidden()
          }

          const body = await request.json()
          const parsed = createTimeEntrySchema.safeParse(body)
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten() },
              { status: 400 },
            )
          }

          const activeProject = await db.query.projects.findFirst({
            where: and(
              eq(projects.id, parsed.data.projectId),
              eq(projects.isActive, true),
            ),
          })
          if (!activeProject) {
            return badRequest('Le projet est inactif ou inexistant')
          }

          // Wrap cap checks + insert in a transaction to prevent race conditions
          const created = await db.transaction(async (tx) => {
            // Check day total won't exceed max
            const existingDay = await tx
              .select({ total: sql<string>`coalesce(sum(${timeEntries.duration}), '0')` })
              .from(timeEntries)
              .where(
                and(
                  eq(timeEntries.userId, user.id),
                  eq(timeEntries.workDate, parsed.data.workDate),
                ),
              )
            const dayTotal = parseFloat(existingDay[0]?.total ?? '0') + parsed.data.duration
            if (dayTotal > MAX_HOURS_PER_DAY) {
              throw new Error(
                `Le total journalier (${dayTotal}h) dépasse le maximum de ${MAX_HOURS_PER_DAY}h`,
              )
            }

            // Check week total won't exceed target
            const workDate = new Date(parsed.data.workDate + 'T00:00:00')
            const isoWeek = getIsoWeek(workDate)
            const isoYear = getIsoWeekYear(workDate)
            const weekMonday = getIsoWeekMonday(isoYear, isoWeek)
            const weekSunday = new Date(weekMonday)
            weekSunday.setDate(weekMonday.getDate() + 6)
            const existingWeek = await tx
              .select({ total: sql<string>`coalesce(sum(${timeEntries.duration}), '0')` })
              .from(timeEntries)
              .where(
                and(
                  eq(timeEntries.userId, user.id),
                  between(timeEntries.workDate, toDateKey(weekMonday), toDateKey(weekSunday)),
                ),
              )
            const weekTotal = parseFloat(existingWeek[0]?.total ?? '0') + parsed.data.duration
            const weekMax = weekTargetHours(isoYear, isoWeek)
            if (weekTotal > weekMax) {
              throw new Error(
                `Le total de la semaine (${weekTotal}h) dépasserait le maximum de ${weekMax}h`,
              )
            }

            const [row] = await tx
              .insert(timeEntries)
              .values({
                userId: user.id,
                projectId: parsed.data.projectId,
                workDate: parsed.data.workDate,
                startTime: parsed.data.startTime ?? null,
                duration: String(parsed.data.duration),
              })
              .returning()
            return row
          }).catch((err: Error) => {
            // Re-throw as a badRequest response for cap violations
            return err
          })

          if (created instanceof Error) {
            return badRequest(created.message)
          }

          return Response.json(created, { status: 201 })
        }),
      }),
  },
})
