import { createMiddleware } from '@tanstack/react-start'
import { authMiddleware } from './auth'
import type { UserRole } from '~/db/schema'

export function requireRoles(allowedRoles: UserRole[]) {
  return createMiddleware()
    .middleware([authMiddleware])
    .server(async ({ next, context }) => {
      const hasRole = context.user.roles.some((r: string) =>
        allowedRoles.includes(r as UserRole),
      )
      if (!hasRole) {
        throw Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      return next()
    })
}

/**
 * Sync auth: accepts X-API-Key header matching SYNC_API_KEY env var.
 * Used on the sync endpoint for n8n / external system calls.
 */
export const requireApiKey = createMiddleware().server(
  async ({ request, next }) => {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      throw Response.json(
        { error: 'Missing X-API-Key header' },
        { status: 401 },
      )
    }

    const expectedKey = process.env.SYNC_API_KEY
    if (!expectedKey) {
      throw Response.json(
        { error: 'SYNC_API_KEY is not configured on the server' },
        { status: 500 },
      )
    }

    // Timing-safe comparison to prevent timing attacks
    const { timingSafeEqual } = await import('node:crypto')
    const a = Buffer.from(apiKey)
    const b = Buffer.from(expectedKey)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw Response.json({ error: 'Invalid API key' }, { status: 401 })
    }

    return next()
  },
)
