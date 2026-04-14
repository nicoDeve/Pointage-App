import { createFileRoute } from '@tanstack/react-router'
import { and, eq, ne, sql, between } from 'drizzle-orm'
import { db } from '~/db'
import { timeEntries, projects } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import {
  timeEntryIdParamSchema,
  updateTimeEntrySchema,
} from '~/lib/validators/time-entries'
import { badRequest, notFound, forbidden, safeHandler } from '~/lib/errors'
import {
  MAX_HOURS_PER_DAY,
  getIsoWeek,
  getIsoWeekYear,
  getIsoWeekMonday,
  weekTargetHours,
  toDateKey,
  parseDuration,
} from '@repo/shared'

export const Route = createFileRoute('/api/time-entries/$id')({
  server: {
    middleware: [authMiddleware],
    handlers: ({ createHandlers }) =>
      createHandlers({
        PATCH: safeHandler(async ({ params, request, context }) => {
          const { user } = context as AuthContext
          const paramsParsed = timeEntryIdParamSchema.safeParse(params)
          if (!paramsParsed.success) return badRequest('Invalid ID')

          const entry = await db.query.timeEntries.findFirst({
            where: eq(timeEntries.id, paramsParsed.data.id),
          })
          if (!entry) return notFound('Time entry not found')

          const isOwner = entry.userId === user.id
          const isAdmin = user.roles.includes('admin')
          if (!isOwner && !isAdmin) {
            return forbidden(
              'Un collaborateur ne peut modifier que ses propres entrées',
            )
          }

          const body = await request.json()
          const parsed = updateTimeEntrySchema.safeParse(body)
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten() },
              { status: 400 },
            )
          }

          // Validate active project if changing projectId
          if (parsed.data.projectId !== undefined) {
            const activeProject = await db.query.projects.findFirst({
              where: and(
                eq(projects.id, parsed.data.projectId),
                eq(projects.isActive, true),
              ),
            })
            if (!activeProject) {
              return badRequest('Le projet est inactif ou inexistant')
            }
          }

          // Wrap cap checks + update in a transaction to prevent race conditions
          if (parsed.data.duration !== undefined) {
            const result = await db.transaction(async (tx) => {
              const workDate = parsed.data.workDate ?? entry.workDate
              const otherDay = await tx
                .select({ total: sql<string>`coalesce(sum(${timeEntries.duration}), '0')` })
                .from(timeEntries)
                .where(
                  and(
                    eq(timeEntries.userId, entry.userId),
                    eq(timeEntries.workDate, workDate),
                    ne(timeEntries.id, paramsParsed.data.id),
                  ),
                )
              const dayTotal = parseFloat(otherDay[0]?.total ?? '0') + parsed.data.duration!
              if (dayTotal > MAX_HOURS_PER_DAY) {
                throw new Error(
                  `Le total journalier (${dayTotal}h) dépasse le maximum de ${MAX_HOURS_PER_DAY}h`,
                )
              }

              // Check week total won't exceed target
              const workDateObj = new Date(workDate + 'T00:00:00')
              const isoWeek = getIsoWeek(workDateObj)
              const isoYear = getIsoWeekYear(workDateObj)
              const weekMonday = getIsoWeekMonday(isoYear, isoWeek)
              const weekSunday = new Date(weekMonday)
              weekSunday.setDate(weekMonday.getDate() + 6)
              const otherWeek = await tx
                .select({ total: sql<string>`coalesce(sum(${timeEntries.duration}), '0')` })
                .from(timeEntries)
                .where(
                  and(
                    eq(timeEntries.userId, entry.userId),
                    between(timeEntries.workDate, toDateKey(weekMonday), toDateKey(weekSunday)),
                    ne(timeEntries.id, paramsParsed.data.id),
                  ),
                )
              const weekTotal = parseFloat(otherWeek[0]?.total ?? '0') + parsed.data.duration!
              const weekMax = weekTargetHours(isoYear, isoWeek)
              if (weekTotal > weekMax) {
                throw new Error(
                  `Le total de la semaine (${weekTotal}h) dépasserait le maximum de ${weekMax}h`,
                )
              }

              const updateData: Record<string, unknown> = { updatedAt: new Date() }
              if (parsed.data.projectId !== undefined)
                updateData.projectId = parsed.data.projectId
              if (parsed.data.workDate !== undefined)
                updateData.workDate = parsed.data.workDate
              if (parsed.data.startTime !== undefined)
                updateData.startTime = parsed.data.startTime
              updateData.duration = String(parsed.data.duration)

              const [row] = await tx
                .update(timeEntries)
                .set(updateData)
                .where(eq(timeEntries.id, paramsParsed.data.id))
                .returning()
              return row
            }).catch((err: Error) => err)

            if (result instanceof Error) {
              return badRequest(result.message)
            }
            return Response.json(result)
          }

          // No duration change — check day cap if workDate changed
          if (parsed.data.workDate !== undefined && parsed.data.workDate !== entry.workDate) {
            const otherDay = await db
              .select({ total: sql<string>`coalesce(sum(${timeEntries.duration}), '0')` })
              .from(timeEntries)
              .where(
                and(
                  eq(timeEntries.userId, entry.userId),
                  eq(timeEntries.workDate, parsed.data.workDate),
                  ne(timeEntries.id, paramsParsed.data.id),
                ),
              )
            const dayTotal = parseFloat(otherDay[0]?.total ?? '0') + parseDuration(entry.duration)
            if (dayTotal > MAX_HOURS_PER_DAY) {
              return badRequest(
                `Le total journalier (${dayTotal}h) dépasse le maximum de ${MAX_HOURS_PER_DAY}h`,
              )
            }
          }

          const updateData: Record<string, unknown> = { updatedAt: new Date() }
          if (parsed.data.projectId !== undefined)
            updateData.projectId = parsed.data.projectId
          if (parsed.data.workDate !== undefined)
            updateData.workDate = parsed.data.workDate
          if (parsed.data.startTime !== undefined)
            updateData.startTime = parsed.data.startTime

          const [updated] = await db
            .update(timeEntries)
            .set(updateData)
            .where(eq(timeEntries.id, paramsParsed.data.id))
            .returning()

          return Response.json(updated)
        }),

        DELETE: safeHandler(async ({ params, context }) => {
          const { user } = context as AuthContext
          const paramsParsed = timeEntryIdParamSchema.safeParse(params)
          if (!paramsParsed.success) return badRequest('Invalid ID')

          const entry = await db.query.timeEntries.findFirst({
            where: eq(timeEntries.id, paramsParsed.data.id),
          })
          if (!entry) return notFound('Time entry not found')

          const isOwner = entry.userId === user.id
          const isAdmin = user.roles.includes('admin')
          if (!isOwner && !isAdmin) {
            return forbidden(
              'Un collaborateur ne peut supprimer que ses propres entrées',
            )
          }

          await db
            .delete(timeEntries)
            .where(eq(timeEntries.id, paramsParsed.data.id))

          return new Response(null, { status: 204 })
        }),
      }),
  },
})
