import { db } from '../src/db'
import { projects, timeEntries } from '../src/db/schema'
import { eq, sql } from 'drizzle-orm'

async function main() {
  const all = await db
    .select({
      id: projects.id,
      name: projects.name,
      externalSourceId: projects.externalSourceId,
      isActive: projects.isActive,
      entriesCount: sql<number>`(SELECT count(*) FROM time_entries WHERE project_id = ${projects.id})`,
    })
    .from(projects)

  console.table(all.map(p => ({
    id: p.id.slice(0, 8) + '...',
    name: p.name,
    extId: p.externalSourceId ?? '—',
    active: p.isActive,
    entries: Number(p.entriesCount),
  })))

  process.exit(0)
}

main()
