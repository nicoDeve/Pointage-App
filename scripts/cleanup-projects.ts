import { db } from '../src/db'
import { projects, timeEntries } from '../src/db/schema'

async function main() {
  // D'abord supprimer les time entries
  const deletedEntries = await db.delete(timeEntries).returning({ id: timeEntries.id })
  console.log(`${deletedEntries.length} time entries supprimées`)

  // Puis les projets
  const deleted = await db.delete(projects).returning({ id: projects.id, name: projects.name })
  console.log(`${deleted.length} projets supprimés :`)
  deleted.forEach(p => console.log(`  - ${p.name}`))
  process.exit(0)
}

main()
