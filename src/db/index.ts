import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

function createDb() {
  return drizzle({
    connection: {
      connectionString: process.env.DATABASE_URL!,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30_000,
    },
    schema,
  })
}

type Database = ReturnType<typeof createDb>

const globalForDb = globalThis as unknown as { __db?: Database }

export const db: Database = globalForDb.__db ?? createDb()

// Preserve pool across HMR reloads in dev
if (process.env.NODE_ENV !== 'production') {
  globalForDb.__db = db
}
