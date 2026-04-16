import { createFileRoute } from '@tanstack/react-router'
import { and, eq, between } from 'drizzle-orm'
import { db } from '~/db'
import { timeEntries, projects } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import {
  listTimeEntriesQuerySchema,
  createTimeEntrySchema,
} from '~/lib/validators/time-entries'
import { forbidden, badRequest, safeHandler } from '~/lib/errors'
import { hasRole, SUPPORT_PAGE_ROLES, ENTRY_CREATION_ROLES } from '@repo/shared'
import { validateTimeEntryCaps } from '~/lib/validators/time-entry-caps'

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
          const canViewOthers = hasRole(user.roles, SUPPORT_PAGE_ROLES)
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
          const canCreate = hasRole(user.roles, ENTRY_CREATION_ROLES)
          if (!canCreate) {
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
          try {
            const row = await db.transaction(async (tx) => {
              await validateTimeEntryCaps(tx, user.id, parsed.data.workDate, parsed.data.duration)

              const [created] = await tx
                .insert(timeEntries)
                .values({
                  userId: user.id,
                  projectId: parsed.data.projectId,
                  workDate: parsed.data.workDate,
                  startTime: parsed.data.startTime ?? null,
                  duration: String(parsed.data.duration),
                })
                .returning()
              return created
            })

            return Response.json(row, { status: 201 })
          } catch (err) {
            if (err instanceof Error) {
              return badRequest(err.message)
            }
            throw err
          }
        }),
      }),
  },
})
