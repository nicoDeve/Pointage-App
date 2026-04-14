import { createFileRoute } from '@tanstack/react-router'
import { authMiddleware, type AuthContext } from '~/middleware/auth'
import { safeHandler } from '~/lib/errors'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: safeHandler(async ({ context }) => {
        const { user } = context as AuthContext
        return Response.json(user)
      }),
    },
  },
})
