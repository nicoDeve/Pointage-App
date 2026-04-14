import { createFileRoute } from '@tanstack/react-router'
import { eq, sql } from 'drizzle-orm'
import { db } from '~/db'
import { projects, timeEntries } from '~/db/schema'
import { requireRoles } from '~/middleware/roles'
import {
  projectIdParamSchema,
  updateProjectSchema,
} from '~/lib/validators/projects'
import { badRequest, notFound, safeHandler } from '~/lib/errors'

export const Route = createFileRoute('/api/projects/$id')({
  server: {
    middleware: [requireRoles(['admin'])],
    handlers: {
      PATCH: safeHandler(async ({ params, request }) => {
        const paramsParsed = projectIdParamSchema.safeParse(params)
        if (!paramsParsed.success) {
          return badRequest('Invalid project ID')
        }

        const body = await request.json()
        const parsed = updateProjectSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { error: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const [updated] = await db
          .update(projects)
          .set({ ...parsed.data, updatedAt: new Date() })
          .where(eq(projects.id, paramsParsed.data.id))
          .returning()

        if (!updated) return notFound('Project not found')
        return Response.json(updated)
      }),

      DELETE: safeHandler(async ({ params }) => {
        const paramsParsed = projectIdParamSchema.safeParse(params)
        if (!paramsParsed.success) {
          return badRequest('Invalid project ID')
        }

        const project = await db.query.projects.findFirst({
          where: eq(projects.id, paramsParsed.data.id),
        })
        if (!project) return notFound('Project not found')

        // Check if project has any time entries
        const [usage] = await db
          .select({ count: sql<number>`count(*)` })
          .from(timeEntries)
          .where(eq(timeEntries.projectId, paramsParsed.data.id))

        if (Number(usage.count) > 0) {
          // Soft-delete: deactivate instead of hard delete
          const [deactivated] = await db
            .update(projects)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(projects.id, paramsParsed.data.id))
            .returning()
          return Response.json(deactivated)
        }

        await db
          .delete(projects)
          .where(eq(projects.id, paramsParsed.data.id))

        return new Response(null, { status: 204 })
      }),
    },
  },
})
