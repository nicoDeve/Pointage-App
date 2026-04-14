export function badRequest(message = 'Bad Request') {
  return Response.json({ error: message }, { status: 400 })
}

export function unauthorized(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden') {
  return Response.json({ error: message }, { status: 403 })
}

export function notFound(message = 'Not Found') {
  return Response.json({ error: message }, { status: 404 })
}

export function conflict(message = 'Conflict') {
  return Response.json({ error: message }, { status: 409 })
}

/**
 * Wraps an API route handler with consistent error handling.
 * Re-throws Response objects (used by middleware for control flow),
 * catches everything else and returns a 500 JSON error.
 */
export function safeHandler<T extends (...args: any[]) => Promise<Response>>(
  fn: T,
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof Response) throw err
      console.error('[API]', err)
      return Response.json(
        { error: 'Erreur interne du serveur' },
        { status: 500 },
      )
    }
  }) as T
}
