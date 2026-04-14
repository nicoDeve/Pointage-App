import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import {
  users,
  projects,
  timeEntries,
  absenceRequests,
} from '../src/db/schema'
import * as schema from '../src/db/schema'

const db = drizzle(process.env.DATABASE_URL!, { schema })

// ── Données utilisateurs ──────────────────────────────────────────────────

const USERS = [
  {
    id: '68f330f0-22fc-44a9-b931-33ba246e297c', // Nicolas Paradis — ton OID Entra
    name: 'Nicolas Paradis',
    poste: 'Développeur Full-Stack',
    roles: ['collaborateur', 'admin'] as const,
  },
  {
    id: 'a1b2c3d4-1111-4aaa-bbbb-000000000001',
    name: 'Marie Dupont',
    poste: 'Chef de Projet',
    roles: ['collaborateur', 'validateur'] as const,
  },
  {
    id: 'a1b2c3d4-2222-4aaa-bbbb-000000000002',
    name: 'Lucas Martin',
    poste: 'Designer UX',
    roles: ['collaborateur'] as const,
  },
  {
    id: 'a1b2c3d4-3333-4aaa-bbbb-000000000003',
    name: 'Sophie Laurent',
    poste: 'Responsable RH',
    roles: ['collaborateur', 'support'] as const,
  },
] as const

// ── Données projets ───────────────────────────────────────────────────────

const PROJECTS = [
  { name: 'Application Mobile Holis', color: '#3B82F6', pole: 'Tech', isActive: true, externalSourceId: 'notion-001' },
  { name: 'Site Web Corporate', color: '#10B981', pole: 'Marketing', isActive: true, externalSourceId: 'notion-002' },
  { name: 'Formation Interne', color: '#F59E0B', pole: 'RH', isActive: true, externalSourceId: 'notion-003' },
  { name: 'Projet R&D IA', color: '#8B5CF6', pole: 'Tech', isActive: true, externalSourceId: 'notion-004' },
  { name: 'Support Client', color: '#EF4444', pole: 'Opérations', isActive: true, externalSourceId: 'notion-005' },
  { name: 'Projet Archivé', color: '#6B7280', pole: 'Tech', isActive: false, externalSourceId: 'notion-006' },
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

async function seed() {
  console.log('🌱 Début du seeding...\n')

  // ── Nettoyage ───────────────────────────────────────────────────────────
  console.log('  Nettoyage des tables existantes...')
  await db.delete(timeEntries)
  await db.delete(absenceRequests)
  await db.delete(projects)
  await db.delete(users)
  console.log('  ✓ Tables nettoyées\n')

  // ── Users ───────────────────────────────────────────────────────────────
  console.log('  Insertion des utilisateurs...')
  const insertedUsers = await db
    .insert(users)
    .values(
      USERS.map((u) => ({
        id: u.id,
        name: u.name,
        poste: u.poste,
        roles: [...u.roles],
      })),
    )
    .returning()
  console.log(`  ✓ ${insertedUsers.length} utilisateurs créés`)
  for (const u of insertedUsers) {
    console.log(`    - ${u.id} (${u.poste}) [${u.roles.join(', ')}]`)
  }
  console.log()

  // ── Projects ────────────────────────────────────────────────────────────
  console.log('  Insertion des projets...')
  const insertedProjects = await db
    .insert(projects)
    .values(
      PROJECTS.map((p) => ({
        name: p.name,
        color: p.color,
        pole: p.pole,
        isActive: p.isActive,
        externalSourceId: p.externalSourceId,
        syncedAt: new Date(),
      })),
    )
    .returning()
  console.log(`  ✓ ${insertedProjects.length} projets créés`)
  for (const p of insertedProjects) {
    console.log(`    - ${p.name} (${p.color}) [${p.isActive ? 'actif' : 'inactif'}] — pôle: ${p.pole}`)
  }
  console.log()

  const activeProjects = insertedProjects.filter((p) => p.isActive)

  // ── Time Entries (semaine courante + semaine précédente) ────────────────
  console.log('  Insertion des saisies d\'heures...')
  const today = new Date()
  const thisMonday = getMonday(today)
  const lastMonday = addDays(thisMonday, -7)

  const timeEntryValues = []

  for (const user of insertedUsers) {
    for (const monday of [lastMonday, thisMonday]) {
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const workDate = formatDate(addDays(monday, dayOffset))
        const project = activeProjects[Math.floor(Math.random() * activeProjects.length)]
        const duration = (5 + Math.random() * 4).toFixed(2) // 5h à 9h
        const startHour = 8 + Math.floor(Math.random() * 2) // 8h ou 9h
        const startTime = `${String(startHour).padStart(2, '0')}:00`

        timeEntryValues.push({
          userId: user.id,
          projectId: project.id,
          workDate,
          startTime,
          duration,
        })

        if (Math.random() > 0.5) {
          const project2 = activeProjects.find((p) => p.id !== project.id)!
          const duration2 = (1 + Math.random() * 2).toFixed(2)
          timeEntryValues.push({
            userId: user.id,
            projectId: project2.id,
            workDate,
            startTime: '14:00',
            duration: duration2,
          })
        }
      }
    }
  }

  const insertedTimeEntries = await db
    .insert(timeEntries)
    .values(timeEntryValues)
    .returning()
  console.log(`  ✓ ${insertedTimeEntries.length} saisies d'heures créées`)
  console.log(`    - Semaine du ${formatDate(lastMonday)} : ${insertedTimeEntries.filter((t) => t.workDate >= formatDate(lastMonday) && t.workDate < formatDate(thisMonday)).length} entrées`)
  console.log(`    - Semaine du ${formatDate(thisMonday)} : ${insertedTimeEntries.filter((t) => t.workDate >= formatDate(thisMonday)).length} entrées`)
  console.log()

  // ── Absence Requests ────────────────────────────────────────────────────
  console.log('  Insertion des demandes d\'absence...')
  const absenceValues = [
    {
      userId: USERS[0].id, // Nicolas — congés approuvés
      type: 'conges_payes' as const,
      startDate: formatDate(addDays(today, 14)),
      endDate: formatDate(addDays(today, 18)),
      status: 'approuvee' as const,
      processedByUserId: USERS[1].id,
      processedAt: new Date(),
    },
    {
      userId: USERS[2].id, // Designer — en attente
      type: 'conges_payes' as const,
      startDate: formatDate(addDays(today, 7)),
      endDate: formatDate(addDays(today, 11)),
      status: 'en_attente' as const,
    },
    {
      userId: USERS[1].id, // Chef de projet — en attente
      type: 'teletravail' as const,
      startDate: formatDate(addDays(today, 3)),
      endDate: formatDate(addDays(today, 3)),
      status: 'en_attente' as const,
    },
    {
      userId: USERS[0].id, // Nicolas — maladie refusée (test)
      type: 'maladie' as const,
      startDate: formatDate(addDays(today, -30)),
      endDate: formatDate(addDays(today, -28)),
      status: 'refusee' as const,
      processedByUserId: USERS[1].id,
      processedAt: new Date(),
      rejectReasonCode: 'delai_non_respecte' as const,
      rejectComment: 'Justificatif médical non fourni dans les délais',
    },
    {
      userId: USERS[3].id, // RH — sans solde en attente
      type: 'sans_solde' as const,
      startDate: formatDate(addDays(today, 21)),
      endDate: formatDate(addDays(today, 25)),
      status: 'en_attente' as const,
    },
  ]

  const insertedAbsences = await db
    .insert(absenceRequests)
    .values(absenceValues)
    .returning()
  console.log(`  ✓ ${insertedAbsences.length} demandes d'absence créées`)
  for (const a of insertedAbsences) {
    console.log(`    - ${a.type} [${a.status}] du ${a.startDate} au ${a.endDate}`)
  }
  console.log()

  // ── Résumé ──────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════')
  console.log('  SEED TERMINÉ AVEC SUCCÈS')
  console.log('═══════════════════════════════════════════')
  console.log(`  ${insertedUsers.length} utilisateurs`)
  console.log(`  ${insertedProjects.length} projets (${activeProjects.length} actifs)`)
  console.log(`  ${insertedTimeEntries.length} saisies d'heures`)
  console.log(`  ${insertedAbsences.length} demandes d'absence`)
  console.log()
  console.log('  Ton user admin : ${USERS[0].id}')
  console.log('  Rôles : admin, collaborateur')
  console.log()

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Erreur pendant le seed:', err)
  process.exit(1)
})
