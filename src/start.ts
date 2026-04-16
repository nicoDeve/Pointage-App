import { createStart, createMiddleware } from '@tanstack/react-start'

// TODO: audit log — global request middleware to capture all mutations
// TODO: V2 — rate limiting middleware

const apiLoggingMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const start = Date.now()
    const result = await next()
    const duration = Date.now() - start
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[API] ${request.method} ${request.url} — ${duration}ms`)
    }
    return result
  },
)

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [apiLoggingMiddleware],
  }
})
