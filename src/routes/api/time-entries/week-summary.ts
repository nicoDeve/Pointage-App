import { createFileRoute } from '@tanstack/react-router'
import { and, eq, between, sql, gte, lte } from 'drizzle-orm'
import { db } from '~/db'
import { timeEntries, absenceRequests } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import { weekSummaryQuerySchema } from '~/lib/validators/time-entries'
import { forbidden, safeHandler } from '~/lib/errors'
import { hasRole, SUPPORT_PAGE_ROLES } from '@repo/shared'

export const Route = createFileRoute('/api/time-entries/week-summary')({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: safeHandler(async ({ request, context }) => {
        const { user } = context as AuthContext
        const url = new URL(request.url)
        const parsed = weekSummaryQuerySchema.safeParse(
          Object.fromEntries(url.searchParams),
        )
        if (!parsed.success) {
          return Response.json(
            { error: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const { userId, weekStart } = parsed.data

        const isSelf = user.id === userId
        const canViewOthers = hasRole(user.roles, SUPPORT_PAGE_ROLES)
        if (!isSelf && !canViewOthers) {
          return forbidden()
        }

        const weekStartDate = new Date(weekStart)
        const weekEndDate = new Date(weekStartDate)
        weekEndDate.setDate(weekEndDate.getDate() + 6)
        const weekEnd = weekEndDate.toISOString().split('T')[0]

        const [summary] = await db
          .select({
            totalHours: sql<number>`coalesce(sum(${timeEntries.duration}::numeric), 0)`,
            distinctProjects: sql<number>`count(distinct ${timeEntries.projectId})`,
          })
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.userId, userId),
              between(timeEntries.workDate, weekStart, weekEnd),
            ),
          )

        const absenceOverlap = await db
          .select({ id: absenceRequests.id })
          .from(absenceRequests)
          .where(
            and(
              eq(absenceRequests.userId, userId),
              eq(absenceRequests.status, 'approuvee'),
              lte(absenceRequests.startDate, weekEnd),
              gte(absenceRequests.endDate, weekStart),
            ),
          )
          .limit(1)

        return Response.json({
          totalHours: Number(summary.totalHours),
          distinctProjects: Number(summary.distinctProjects),
          hasAbsenceOverlap: absenceOverlap.length > 0,
        })
      }),
    },
  },
})
