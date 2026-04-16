import { createFileRoute } from '@tanstack/react-router'
import { and, eq, ne, sql } from 'drizzle-orm'
import { db } from '~/db'
import { timeEntries, projects } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import {
  timeEntryIdParamSchema,
  updateTimeEntrySchema,
} from '~/lib/validators/time-entries'
import { badRequest, notFound, forbidden, safeHandler } from '~/lib/errors'
import { MAX_HOURS_PER_DAY, parseDuration, hasRole } from '@repo/shared'
import { validateTimeEntryCaps } from '~/lib/validators/time-entry-caps'

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
          const isAdmin = hasRole(user.roles, ['admin'])
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
            try {
              const row = await db.transaction(async (tx) => {
                const workDate = parsed.data.workDate ?? entry.workDate
                await validateTimeEntryCaps(tx, entry.userId, workDate, parsed.data.duration!, paramsParsed.data.id)

                const updateData: Record<string, unknown> = { updatedAt: new Date() }
                if (parsed.data.projectId !== undefined)
                  updateData.projectId = parsed.data.projectId
                if (parsed.data.workDate !== undefined)
                  updateData.workDate = parsed.data.workDate
                if (parsed.data.startTime !== undefined)
                  updateData.startTime = parsed.data.startTime
                updateData.duration = String(parsed.data.duration)

                const [updated] = await tx
                  .update(timeEntries)
                  .set(updateData)
                  .where(eq(timeEntries.id, paramsParsed.data.id))
                  .returning()
                return updated
              })

              return Response.json(row)
            } catch (err) {
              if (err instanceof Error) {
                return badRequest(err.message)
              }
              throw err
            }
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
          const isAdmin = hasRole(user.roles, ['admin'])
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
