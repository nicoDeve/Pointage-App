import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '~/db'
import { absenceRequests } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import { absenceRequestIdParamSchema } from '~/lib/validators/absence-requests'
import { badRequest, notFound, forbidden, safeHandler } from '~/lib/errors'
import { hasRole, ABSENCE_VIEW_ROLES } from '@repo/shared'

export const Route = createFileRoute('/api/absence-requests/$id/')({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: safeHandler(async ({ params, context }) => {
        const { user } = context as AuthContext
        const paramsParsed = absenceRequestIdParamSchema.safeParse(params)
        if (!paramsParsed.success) return badRequest('Invalid ID')

        const found = await db.query.absenceRequests.findFirst({
          where: eq(absenceRequests.id, paramsParsed.data.id),
        })
        if (!found) return notFound('Absence request not found')

        const isOwner = found.userId === user.id
        const canView = hasRole(user.roles, ABSENCE_VIEW_ROLES)
        if (!isOwner && !canView) return forbidden()

        return Response.json(found)
      }),
    },
  },
})
