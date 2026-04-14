import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '~/db'
import { absenceRequests } from '~/db/schema'
import { requireRoles } from '~/middleware/roles'
import {
  absenceRequestIdParamSchema,
  rejectAbsenceRequestSchema,
} from '~/lib/validators/absence-requests'
import { badRequest, notFound, forbidden, conflict, safeHandler } from '~/lib/errors'
import type { AuthContext } from '~/middleware/auth'

export const Route = createFileRoute('/api/absence-requests/$id/reject')({
  server: {
    middleware: [requireRoles(['validateur', 'admin'])],
    handlers: {
      PATCH: safeHandler(async ({ params, request, context }) => {
        const { user } = context as AuthContext
        const paramsParsed = absenceRequestIdParamSchema.safeParse(params)
        if (!paramsParsed.success) return badRequest('Invalid ID')

        const body = await request.json()
        const parsed = rejectAbsenceRequestSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { error: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const absenceRequest = await db.query.absenceRequests.findFirst({
          where: eq(absenceRequests.id, paramsParsed.data.id),
        })
        if (!absenceRequest) return notFound('Absence request not found')

        if (absenceRequest.status !== 'en_attente') {
          return conflict('Seule une demande en attente peut être refusée')
        }

        const isAdmin = user.roles.includes('admin')
        if (absenceRequest.userId === user.id && !isAdmin) {
          return forbidden('Un validateur ne peut pas refuser ses propres demandes')
        }

        // TODO: audit log
        const [updated] = await db
          .update(absenceRequests)
          .set({
            status: 'refusee',
            rejectReasonCode: parsed.data.rejectReasonCode,
            rejectComment: parsed.data.rejectComment ?? null,
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
