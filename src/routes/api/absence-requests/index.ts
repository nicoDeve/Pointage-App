import { createFileRoute } from '@tanstack/react-router'
import { and, eq, ne, sql, lte, gte, type SQL } from 'drizzle-orm'
import { db } from '~/db'
import { absenceRequests } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import { safeHandler } from '~/lib/errors'
import {
  listAbsenceRequestsQuerySchema,
  createAbsenceRequestSchema,
} from '~/lib/validators/absence-requests'

export const Route = createFileRoute('/api/absence-requests/')({
  server: {
    middleware: [authMiddleware],
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: safeHandler(async ({ request, context }) => {
          const { user } = context as AuthContext
          const url = new URL(request.url)
          const parsed = listAbsenceRequestsQuerySchema.safeParse(
            Object.fromEntries(url.searchParams),
          )
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten() },
              { status: 400 },
            )
          }

          const { page, limit, status, userId } = parsed.data
          const offset = (page - 1) * limit

          const conditions: SQL[] = []

          const isAdmin = user.roles.includes('admin')
          const isValidateur = user.roles.includes('validateur')
          const isSupport = user.roles.includes('support')

          if (isAdmin || isSupport) {
            if (userId) conditions.push(eq(absenceRequests.userId, userId))
          } else if (isValidateur) {
            conditions.push(eq(absenceRequests.status, 'en_attente'))
            conditions.push(ne(absenceRequests.userId, user.id))
          } else {
            conditions.push(eq(absenceRequests.userId, user.id))
          }

          if (status) {
            conditions.push(eq(absenceRequests.status, status))
          }

          const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined

          const [data, countResult] = await Promise.all([
            db
              .select()
              .from(absenceRequests)
              .where(whereClause)
              .limit(limit)
              .offset(offset)
              .orderBy(absenceRequests.createdAt),
            db
              .select({ count: sql<number>`count(*)` })
              .from(absenceRequests)
              .where(whereClause),
          ])

          return Response.json({
            data,
            total: Number(countResult[0].count),
            page,
            limit,
          })
        }),

        POST: safeHandler(async ({ request, context }) => {
          const { user } = context as AuthContext
          const hasRole = user.roles.some((r: string) =>
            ['collaborateur', 'admin'].includes(r),
          )
          if (!hasRole) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }

          const body = await request.json()
          const parsed = createAbsenceRequestSchema.safeParse(body)
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten() },
              { status: 400 },
            )
          }

          // Wrap overlap check + insert in a transaction to prevent race conditions
          const result = await db.transaction(async (tx) => {
            const overlapping = await tx
              .select({ id: absenceRequests.id, halfDay: absenceRequests.halfDay })
              .from(absenceRequests)
              .where(
                and(
                  eq(absenceRequests.userId, user.id),
                  ne(absenceRequests.status, 'refusee'),
                  lte(absenceRequests.startDate, parsed.data.endDate),
                  gte(absenceRequests.endDate, parsed.data.startDate),
                ),
              )

            if (overlapping.length > 0) {
              const allExistingHalf = overlapping.every((r) => r.halfDay)
              const newIsHalf = parsed.data.halfDay ?? false
              if (!allExistingHalf || !newIsHalf) {
                throw new Error('OVERLAP')
              }
            }

            const [row] = await tx
              .insert(absenceRequests)
              .values({
                userId: user.id,
                type: parsed.data.type,
                startDate: parsed.data.startDate,
                endDate: parsed.data.endDate,
                halfDay: parsed.data.halfDay ?? false,
                comment: parsed.data.comment,
              })
              .returning()
            return row
          }).catch((err: Error) => err)

          if (result instanceof Error) {
            if (result.message === 'OVERLAP') {
              return Response.json(
                { error: 'Une demande d\u2019absence existe déjà sur cette période' },
                { status: 409 },
              )
            }
            throw result
          }

          return Response.json(result, { status: 201 })
        }),
      }),
  },
})
