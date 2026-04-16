import { db } from '../src/db/index.js'
import { timeEntries, users, projects } from '../src/db/schema.js'
import { eq } from 'drizzle-orm'

async function main() {
  const allUsers = await db
    .select({ id: users.id, name: users.name, roles: users.roles })
    .from(users)
  console.log('=== USERS ===')
  allUsers.forEach((u) => console.log(u.id.slice(0, 8), u.name, u.roles))

  console.log('\n=== ALL TIME ENTRIES ===')
  const entries = await db
    .select()
    .from(timeEntries)
    .orderBy(timeEntries.workDate)
  entries.forEach((e) =>
    console.log(e.workDate, e.duration + 'h', e.projectId.slice(0, 8), e.userId.slice(0, 8)),
  )
  console.log(`Total: ${entries.length} entries`)

  console.log('\n=== PROJECTS ===')
  const projs = await db
    .select({ id: projects.id, name: projects.name, isActive: projects.isActive })
    .from(projects)
  projs.forEach((p) => console.log(p.id.slice(0, 8), p.isActive ? 'ACTIVE' : 'INACTIVE', p.name))

  process.exit(0)
}

main()
