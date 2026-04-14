import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db'
import { users } from '~/db/schema'
import { requireRoles } from '~/middleware/roles'
import { listUsersQuerySchema } from '~/lib/validators/users'
import { safeHandler } from '~/lib/errors'
import { sql } from 'drizzle-orm'

export const Route = createFileRoute('/api/users/')({
  server: {
    middleware: [requireRoles(['admin', 'support'])],
    handlers: {
      GET: safeHandler(async ({ request }) => {
        const url = new URL(request.url)
        const parsed = listUsersQuerySchema.safeParse(
          Object.fromEntries(url.searchParams),
        )
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        const { page, limit } = parsed.data
        const offset = (page - 1) * limit

        const [data, countResult] = await Promise.all([
          db.select().from(users).limit(limit).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(users),
        ])

        return Response.json({
          data,
          total: Number(countResult[0].count),
          page,
          limit,
        })
      }),
    },
  },
})
