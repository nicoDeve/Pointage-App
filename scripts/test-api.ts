/**
 * Script de test des routes API.
 * Prérequis : le serveur doit tourner (npm run dev) et le seed doit être passé.
 * Usage : npx tsx scripts/test-api.ts
 */

const BASE = 'http://localhost:3000'

const NICOLAS_ID = '68f330f0-22fc-44a9-b931-33ba246e297c'
const VALIDATEUR_ID = 'a1b2c3d4-1111-4aaa-bbbb-000000000001'
const DESIGNER_ID = 'a1b2c3d4-2222-4aaa-bbbb-000000000002'

let passed = 0
let failed = 0
let projectId: string
let timeEntryId: string
let absenceRequestId: string

async function test(
  name: string,
  method: string,
  path: string,
  options: {
    body?: unknown
    expectedStatus?: number
    check?: (data: unknown) => void
  } = {},
) {
  const { body, expectedStatus = 200, check } = options
  const url = `${BASE}${path}`

  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await res.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (res.status !== expectedStatus) {
      console.log(`  ✗ ${name}`)
      console.log(`    Attendu: ${expectedStatus}, Reçu: ${res.status}`)
      console.log(`    Body: ${JSON.stringify(data).slice(0, 200)}`)
      failed++
      return null
    }

    if (check) {
      check(data)
    }

    console.log(`  ✓ ${name} (${res.status})`)
    passed++
    return data
  } catch (err) {
    console.log(`  ✗ ${name} — ERREUR RESEAU`)
    console.log(`    ${err}`)
    failed++
    return null
  }
}

async function run() {
  console.log()
  console.log('═══════════════════════════════════════════')
  console.log('  TESTS API — Pointage App')
  console.log('═══════════════════════════════════════════')
  console.log(`  Serveur : ${BASE}`)
  console.log(`  User dev : ${NICOLAS_ID}`)
  console.log()

  // ── USERS ──────────────────────────────────────────────────────────────
  console.log('── Utilisateurs ────────────────────────')

  await test('GET /api/users — liste (admin)', 'GET', '/api/users', {
    check: (data: any) => {
      if (!data.data || data.data.length === 0) throw new Error('Aucun user')
    },
  })

  await test(
    'GET /api/users/:id — son propre profil',
    'GET',
    `/api/users/${NICOLAS_ID}`,
    {
      check: (data: any) => {
        if (data.id !== NICOLAS_ID) throw new Error('Mauvais user')
      },
    },
  )

  await test(
    'PATCH /api/users/:id — modifier poste (admin)',
    'PATCH',
    `/api/users/${DESIGNER_ID}`,
    {
      body: { poste: 'Designer UX Senior' },
      check: (data: any) => {
        if (data.poste !== 'Designer UX Senior')
          throw new Error('Poste non mis à jour')
      },
    },
  )

  console.log()

  // ── PROJECTS ───────────────────────────────────────────────────────────
  console.log('── Projets ─────────────────────────────')

  await test('GET /api/projects — tous', 'GET', '/api/projects', {
    check: (data: any) => {
      if (!Array.isArray(data) || data.length === 0)
        throw new Error('Aucun projet')
    },
  })

  await test(
    'GET /api/projects?isActive=true — actifs seulement',
    'GET',
    '/api/projects?isActive=true',
    {
      check: (data: any) => {
        if (data.some((p: any) => !p.isActive))
          throw new Error('Projet inactif trouvé')
      },
    },
  )

  const newProject = await test(
    'POST /api/projects — créer un projet (admin)',
    'POST',
    '/api/projects',
    {
      body: {
        name: 'Nouveau Projet Test',
        color: '#FF5733',
        pole: 'Innovation',
      },
      expectedStatus: 201,
    },
  )
  if (newProject) {
    projectId = (newProject as any).id
  }

  if (projectId) {
    await test(
      'PATCH /api/projects/:id — modifier (admin)',
      'PATCH',
      `/api/projects/${projectId}`,
      {
        body: { name: 'Projet Test Modifié', isActive: false },
        check: (data: any) => {
          if (data.name !== 'Projet Test Modifié')
            throw new Error('Nom non modifié')
        },
      },
    )
  }

  await test(
    'POST /api/projects/sync — upsert Notion (admin)',
    'POST',
    '/api/projects/sync',
    {
      body: {
        projects: [
          {
            externalSourceId: 'notion-007',
            name: 'Projet Sync Test',
            color: '#00FF00',
            pole: 'Test',
          },
          {
            externalSourceId: 'notion-001',
            name: 'Application Mobile Holis (Updated via sync)',
            color: '#3B82F6',
            pole: 'Tech',
          },
        ],
      },
      check: (data: any) => {
        if (
          typeof data.created !== 'number' ||
          typeof data.updated !== 'number'
        )
          throw new Error('Réponse sync invalide')
      },
    },
  )

  console.log()

  // ── TIME ENTRIES ───────────────────────────────────────────────────────
  console.log('── Saisies d\'heures ────────────────────')

  const activeProjectsRes = await fetch(`${BASE}/api/projects?isActive=true`)
  const activeProjects = (await activeProjectsRes.json()) as any[]
  const testProjectId = activeProjects[0]?.id

  if (testProjectId) {
    const created = await test(
      'POST /api/time-entries — créer une saisie',
      'POST',
      '/api/time-entries',
      {
        body: {
          projectId: testProjectId,
          workDate: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          duration: 3.5,
        },
        expectedStatus: 201,
      },
    )
    if (created) {
      timeEntryId = (created as any).id
    }
  }

  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  await test(
    'GET /api/time-entries — cette semaine',
    'GET',
    `/api/time-entries?userId=${NICOLAS_ID}&startDate=${monday.toISOString().split('T')[0]}&endDate=${sunday.toISOString().split('T')[0]}`,
    {
      check: (data: any) => {
        if (!Array.isArray(data)) throw new Error('Pas un tableau')
      },
    },
  )

  if (timeEntryId) {
    await test(
      'PATCH /api/time-entries/:id — modifier durée',
      'PATCH',
      `/api/time-entries/${timeEntryId}`,
      {
        body: { duration: 4.0 },
        check: (data: any) => {
          if (Number(data.duration) !== 4)
            throw new Error('Durée non mise à jour')
        },
      },
    )
  }

  await test(
    'GET /api/time-entries/week-summary — résumé semaine',
    'GET',
    `/api/time-entries/week-summary?userId=${NICOLAS_ID}&weekStart=${monday.toISOString().split('T')[0]}`,
    {
      check: (data: any) => {
        if (typeof data.totalHours !== 'number')
          throw new Error('totalHours manquant')
        if (typeof data.distinctProjects !== 'number')
          throw new Error('distinctProjects manquant')
        if (typeof data.hasAbsenceOverlap !== 'boolean')
          throw new Error('hasAbsenceOverlap manquant')
        console.log(
          `    → totalHours: ${data.totalHours}, distinctProjects: ${data.distinctProjects}, hasAbsenceOverlap: ${data.hasAbsenceOverlap}`,
        )
      },
    },
  )

  if (timeEntryId) {
    await test(
      'DELETE /api/time-entries/:id — supprimer',
      'DELETE',
      `/api/time-entries/${timeEntryId}`,
      {
        expectedStatus: 204,
      },
    )
  }

  console.log()

  // ── ABSENCE REQUESTS ──────────────────────────────────────────────────
  console.log('── Demandes d\'absence ──────────────────')

  await test(
    'GET /api/absence-requests — mes demandes',
    'GET',
    '/api/absence-requests',
    {
      check: (data: any) => {
        if (!data.data) throw new Error('Pas de data')
      },
    },
  )

  const futureDate1 = new Date()
  futureDate1.setDate(futureDate1.getDate() + 60)
  const futureDate2 = new Date(futureDate1)
  futureDate2.setDate(futureDate2.getDate() + 2)

  const createdAbsence = await test(
    'POST /api/absence-requests — créer une demande',
    'POST',
    '/api/absence-requests',
    {
      body: {
        type: 'conges_payes',
        startDate: futureDate1.toISOString().split('T')[0],
        endDate: futureDate2.toISOString().split('T')[0],
      },
      expectedStatus: 201,
    },
  )
  if (createdAbsence) {
    absenceRequestId = (createdAbsence as any).id
  }

  if (absenceRequestId) {
    await test(
      'GET /api/absence-requests/:id — détail',
      'GET',
      `/api/absence-requests/${absenceRequestId}`,
      {
        check: (data: any) => {
          if (data.id !== absenceRequestId) throw new Error('Mauvais ID')
        },
      },
    )

    // Nicolas est admin : il PEUT approuver sa propre demande (contournement admin)
    await test(
      'PATCH /api/absence-requests/:id/approve — admin approuve sa propre demande',
      'PATCH',
      `/api/absence-requests/${absenceRequestId}/approve`,
      {
        expectedStatus: 200,
        check: (data: any) => {
          if (data.status !== 'approuvee') throw new Error('Pas approuvée')
        },
      },
    )

    // Tester le rejet d'une demande déjà approuvée = 409
    await test(
      'PATCH /api/absence-requests/:id/reject — demande déjà traitée = 409',
      'PATCH',
      `/api/absence-requests/${absenceRequestId}/reject`,
      {
        body: {
          rejectReasonCode: 'autre',
        },
        expectedStatus: 409,
      },
    )

    // Créer une 2e demande pour tester le rejet
    const absence2 = await test(
      'POST /api/absence-requests — 2e demande pour test rejet',
      'POST',
      '/api/absence-requests',
      {
        body: {
          type: 'teletravail',
          startDate: futureDate1.toISOString().split('T')[0],
          endDate: futureDate1.toISOString().split('T')[0],
        },
        expectedStatus: 201,
      },
    )
    if (absence2) {
      const absence2Id = (absence2 as any).id

      await test(
        'PATCH /api/absence-requests/:id/reject — admin refuse sa demande',
        'PATCH',
        `/api/absence-requests/${absence2Id}/reject`,
        {
          body: {
            rejectReasonCode: 'effectif_insuffisant',
            rejectComment: 'Équipe en sous-effectif sur cette période',
          },
          check: (data: any) => {
            if (data.status !== 'refusee') throw new Error('Pas refusée')
            if (data.rejectReasonCode !== 'effectif_insuffisant')
              throw new Error('Mauvais code motif')
          },
        },
      )
    }
  }

  // ── RÈGLE METIER : projet inactif ──────────────────────────────────────
  console.log()
  console.log('── Règles métier ───────────────────────')

  if (projectId) {
    await test(
      'POST /api/time-entries — projet inactif REJETÉ',
      'POST',
      '/api/time-entries',
      {
        body: {
          projectId,
          workDate: new Date().toISOString().split('T')[0],
          duration: 2,
        },
        expectedStatus: 400,
      },
    )
  }

  // ── RÉSUMÉ ─────────────────────────────────────────────────────────────
  console.log()
  console.log('═══════════════════════════════════════════')
  console.log(`  RÉSULTATS : ${passed} passés, ${failed} échoués`)
  console.log('═══════════════════════════════════════════')
  console.log()

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})
