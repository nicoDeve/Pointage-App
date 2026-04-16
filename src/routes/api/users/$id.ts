import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '~/db'
import { users } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import { userIdParamSchema, updateUserSchema } from '~/lib/validators/users'
import { notFound, forbidden, badRequest, safeHandler } from '~/lib/errors'
import { hasRole, SUPPORT_PAGE_ROLES } from '@repo/shared'

export const Route = createFileRoute('/api/users/$id')({
  server: {
    middleware: [authMiddleware],
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: safeHandler(async ({ params, context }) => {
          const { user } = context as AuthContext
          const parsed = userIdParamSchema.safeParse(params)
          if (!parsed.success) {
            return badRequest('Invalid user ID')
          }

          const isSelf = user.id === parsed.data.id
          const canViewOthers = hasRole(user.roles, SUPPORT_PAGE_ROLES)
          if (!isSelf && !canViewOthers) {
            return forbidden()
          }

          const found = await db.query.users.findFirst({
            where: eq(users.id, parsed.data.id),
          })

          if (!found) return notFound('User not found')
          return Response.json(found)
        }),

        PATCH: safeHandler(async ({ params, request, context }) => {
          const { user } = context as AuthContext
          const isAdmin = hasRole(user.roles, ['admin'])
          if (!isAdmin) {
            return forbidden()
          }

          const paramsParsed = userIdParamSchema.safeParse(params)
          if (!paramsParsed.success) {
            return badRequest('Invalid user ID')
          }

          const body = await request.json()
          const parsed = updateUserSchema.safeParse(body)
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten() },
              { status: 400 },
            )
          }

          // TODO: audit log
          const { leaveQuota, ...rest } = parsed.data
          const [updated] = await db
            .update(users)
            .set({
              ...rest,
              ...(leaveQuota !== undefined ? { leaveQuota: String(leaveQuota) } : {}),
              updatedAt: new Date(),
            })
            .where(eq(users.id, paramsParsed.data.id))
            .returning()

          if (!updated) return notFound('User not found')
          return Response.json(updated)
        }),
      }),
  },
})
