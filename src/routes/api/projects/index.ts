import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '~/db'
import { projects } from '~/db/schema'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import {
  listProjectsQuerySchema,
  createProjectSchema,
} from '~/lib/validators/projects'
import { forbidden, safeHandler } from '~/lib/errors'

export const Route = createFileRoute('/api/projects/')({
  server: {
    middleware: [authMiddleware],
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: safeHandler(async ({ request }) => {
          const url = new URL(request.url)
          const parsed = listProjectsQuerySchema.safeParse(
            Object.fromEntries(url.searchParams),
          )
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten() },
              { status: 400 },
            )
          }

          const query = db.select().from(projects)

          if (parsed.data.isActive !== undefined) {
            const data = await query.where(
              eq(projects.isActive, parsed.data.isActive),
            )
            return Response.json(data)
          }

          const data = await query
          return Response.json(data)
        }),

        POST: safeHandler(async ({ request, context }) => {
          const { user } = context as AuthContext
          if (!user.roles.includes('admin')) {
            return forbidden()
          }

          const body = await request.json()
          const parsed = createProjectSchema.safeParse(body)
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten() },
              { status: 400 },
            )
          }

          // TODO: audit log
          const [created] = await db
            .insert(projects)
            .values(parsed.data)
            .returning()

          return Response.json(created, { status: 201 })
        }),
      }),
  },
})
