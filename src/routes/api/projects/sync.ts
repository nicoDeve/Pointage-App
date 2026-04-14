import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db'
import { projects } from '~/db/schema'
import { requireApiKey } from '~/middleware/roles'
import { syncProjectsSchema } from '~/lib/validators/projects'
import { safeHandler } from '~/lib/errors'
import { sql } from 'drizzle-orm'

export const Route = createFileRoute('/api/projects/sync')({
  server: {
    middleware: [requireApiKey],
    handlers: {
      POST: safeHandler(async ({ request }) => {
        const body = await request.json()
        const parsed = syncProjectsSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            { error: parsed.error.flatten() },
            { status: 400 },
          )
        }

        let created = 0
        let updated = 0

        // Batch upsert all projects in one query
        if (parsed.data.projects.length > 0) {
          const now = new Date()
          const results = await db
            .insert(projects)
            .values(
              parsed.data.projects.map((item) => ({
                name: item.name,
                color: item.color,
                pole: item.pole,
                isActive: item.isActive,
                externalSourceId: item.externalSourceId,
                syncedAt: now,
              })),
            )
            .onConflictDoUpdate({
              target: projects.externalSourceId,
              set: {
                name: sql`excluded.name`,
                color: sql`excluded.color`,
                pole: sql`excluded.pole`,
                isActive: sql`excluded.is_active`,
                syncedAt: now,
                updatedAt: now,
              },
            })
            .returning({ id: projects.id, createdAt: projects.createdAt, updatedAt: projects.updatedAt })

          for (const row of results) {
            const isNew =
              row.createdAt.getTime() === row.updatedAt.getTime() ||
              now.getTime() - row.createdAt.getTime() < 1000
            if (isNew) created++
            else updated++
          }
        }

        return Response.json({ created, updated })
      }),
    },
  },
})
