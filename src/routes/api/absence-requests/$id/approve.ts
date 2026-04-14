import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '~/db'
import { absenceRequests } from '~/db/schema'
import { requireRoles } from '~/middleware/roles'
import { absenceRequestIdParamSchema } from '~/lib/validators/absence-requests'
import { badRequest, notFound, forbidden, conflict, safeHandler } from '~/lib/errors'
import type { AuthContext } from '~/middleware/auth'

export const Route = createFileRoute('/api/absence-requests/$id/approve')({
  server: {
    middleware: [requireRoles(['validateur', 'admin'])],
    handlers: {
      PATCH: safeHandler(async ({ params, context }) => {
        const { user } = context as AuthContext
        const paramsParsed = absenceRequestIdParamSchema.safeParse(params)
        if (!paramsParsed.success) return badRequest('Invalid ID')

        const request = await db.query.absenceRequests.findFirst({
          where: eq(absenceRequests.id, paramsParsed.data.id),
        })
        if (!request) return notFound('Absence request not found')

        if (request.status !== 'en_attente') {
          return conflict('Seule une demande en attente peut être approuvée')
        }

        const isAdmin = user.roles.includes('admin')
        if (request.userId === user.id && !isAdmin) {
          return forbidden('Un validateur ne peut pas approuver ses propres demandes')
        }

        // TODO: audit log
        const [updated] = await db
          .update(absenceRequests)
          .set({
            status: 'approuvee',
            processedByUserId: user.id,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(absenceRequests.id, paramsParsed.data.id))
          .returning()

        return Response.json(updated)
      }),
    },
  },
})
