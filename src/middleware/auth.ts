import { createMiddleware } from '@tanstack/react-start'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { db } from '~/db'
import { users, type User } from '~/db/schema'

export interface EntraClaims {
  oid: string
  preferred_username?: string
  name?: string
  email?: string
}

export interface AuthContext {
  user: User
  claims: EntraClaims
}

const tenantId = () => process.env.ENTRA_TENANT_ID!
const clientId = () => process.env.ENTRA_CLIENT_ID!
const isDevBypass = () => process.env.DEV_AUTH_BYPASS === 'true'
const devUserOid = () => process.env.DEV_USER_OID!

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenantId()}/discovery/v2.0/keys`,
      ),
    )
  }
  return jwks
}

async function resolveUser(oid: string, name?: string): Promise<User> {
  let user = await db.query.users.findFirst({
    where: eq(users.id, oid),
  })

  if (!user) {
    const [created] = await db
      .insert(users)
      .values({ id: oid, name: name ?? null, roles: ['collaborateur'] })
      .returning()
    user = created
  } else if (name && user.name !== name) {
    const [updated] = await db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, oid))
      .returning()
    user = updated
  }

  return user
}

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    // --- DEV BYPASS MODE ---
    if (isDevBypass()) {
      const oid = devUserOid()
      if (!oid) {
        throw Response.json(
          { error: 'DEV_AUTH_BYPASS is true but DEV_USER_OID is not set' },
          { status: 500 },
        )
      }

      const user = await resolveUser(oid, process.env.DEV_USER_NAME ?? 'Dev User')
      const claims: EntraClaims = {
        oid,
        preferred_username: process.env.DEV_USER_EMAIL ?? 'dev@localhost',
        name: process.env.DEV_USER_NAME ?? 'Dev User',
        email: process.env.DEV_USER_EMAIL ?? 'dev@localhost',
      }

      return next({ context: { user, claims } })
    }

    // --- PRODUCTION: JWT VALIDATION ---
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw Response.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 },
      )
    }

    const token = authHeader.slice(7)

    let payload: Record<string, unknown>
    try {
      const result = await jwtVerify(token, getJWKS(), {
        issuer: `https://login.microsoftonline.com/${tenantId()}/v2.0`,
        audience: clientId(),
      })
      payload = result.payload as Record<string, unknown>
    } catch {
      throw Response.json(
        { error: 'Invalid or expired token' },
        { status: 401 },
      )
    }

    const claims: EntraClaims = {
      oid: payload.oid as string,
      preferred_username: payload.preferred_username as string | undefined,
      name: payload.name as string | undefined,
      email: payload.email as string | undefined,
    }

    if (!claims.oid) {
      throw Response.json(
        { error: 'Token missing oid claim' },
        { status: 401 },
      )
    }

    const user = await resolveUser(claims.oid, claims.name)
    return next({ context: { user, claims } })
  },
)
