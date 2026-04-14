# Prompt — Plan d'action complet pointageApp
> À utiliser avec Claude Sonnet 4.6 / Opus 4.6  
> Date de rédaction : avril 2026  
> Stack : TanStack Start + Vite, React 19, TypeScript strict, Drizzle ORM, PostgreSQL, Tailwind CSS v4

---

## Contexte de l'application

`pointageApp` est une application de pointage d'heures pour une équipe. Elle permet :
- Aux **collaborateurs** de saisir leurs heures par projet et par jour
- Aux **validateurs** de gérer les demandes d'absence (approuver/refuser)
- Aux **support** et **admin** de superviser l'équipe (vue support), exporter les données (CSV, Pennylane)
- La synchronisation des projets depuis Notion via un workflow n8n (endpoint `POST /api/projects/sync` protégé par API key)

**Règles absolues d'implémentation :**
- Tu ne crées pas de fichiers inutiles. Tu édites les fichiers existants.
- Tu ne dupliques pas de logique. Si une fonction utilitaire existe dans `packages/shared/src/` ou `src/lib/`, tu l'utilises.
- Tu ne re-fetches pas des données déjà disponibles via le contexte (`useUsers()`, `useAllProjects()` depuis `use-app-data.ts`).
- Tu respectes le pattern d'erreurs : `safeHandler` sur toutes les routes API, `forbidden()` / `badRequest()` de `src/lib/errors.ts`.
- Tu respectes le pattern de badges : tous les badges passent par `src/components/shared/app-badges.tsx`.
- Pour les types partagés, tu les places dans `packages/shared/src/types.ts` et tu les exporres depuis `packages/shared/src/index.ts`.
- Zod validators dans `src/lib/validators/`, un fichier par domaine.
- 0 erreurs TypeScript après chaque modification.

---

## BLOC 2 — HIGH : Bugs fonctionnels (à traiter en priorité)

### H-1 — Annulation d'absence par le collaborateur → 403 silencieux

**Fichiers concernés :** `src/components/absences/absence-list.tsx`, `src/routes/api/absence-requests/`

**Problème :** Le bouton "Annuler" dans `absence-list.tsx` (ligne ~28) appelle `api.absenceRequests.reject()` qui exige le rôle `validateur/admin`. Un collaborateur reçoit un 403 silencieux — la demande reste en attente sans message clair.

**Fix à implémenter :**
1. Créer `src/routes/api/absence-requests/$id/cancel.ts` — endpoint `DELETE` avec `authMiddleware` uniquement (pas de rôle requis). Vérifier : `request.userId === user.id` AND `request.status === 'en_attente'`. Si non : 403. Supprimer la ligne et retourner `{ success: true }`.
2. Dans `src/lib/api.ts`, ajouter `absenceRequests.cancel(id: string)` qui appelle `DELETE /api/absence-requests/${id}/cancel`.
3. Dans `absence-list.tsx`, remplacer l'appel `api.absenceRequests.reject(...)` par `api.absenceRequests.cancel(id)`.

---

### H-2 — Validateur + filtre status = clause WHERE impossible

**Fichier concerné :** `src/routes/api/absence-requests/index.ts` (lignes ~33–50)

**Problème :** Pour un validateur, le code force `status = 'en_attente'` dans les conditions, PUIS ajoute le filtre `?status=approuvee` passé par le client. La requête devient `WHERE status='en_attente' AND status='approuvee'` → 0 résultats.

**Fix :** Dans le bloc `if (isValidateur)`, ne pas appliquer le filtre `status` fourni par le client (les validateurs voient toujours seulement `en_attente`). Ou valider en amont que le param `status` vaut `en_attente` pour un validateur, sinon retourner 400.

---

### H-3 — Flash de thème clair au chargement (FOUC)

**Fichier concerné :** `src/lib/theme.tsx` (ligne ~21)

**Problème :** `const [theme, setTheme] = useState<Theme>('light')` démarre en light, puis `useEffect` applique le vrai thème → flash visible pour les utilisateurs avec préférence dark.

**Fix :** Remplacer par le lazy initializer :
```ts
const [theme, setTheme] = useState<Theme>(getInitialTheme)
// (sans parenthèses — passe la fonction elle-même)
```
Cela appelle `getInitialTheme` synchroniquement au premier render, pas après.

---

### H-4 — Date arithmetic timezone-unsafe dans `week-summary.ts`

**Fichier concerné :** `src/routes/api/time-entries/week-summary.ts` (lignes ~20–24)

**Problème :** Utilise `new Date(weekStart)` + `setDate()` + `toISOString()` — ce mix UTC/local peut produire un `weekEnd` décalé d'un jour sur des serveurs en UTC−.

**Fix :** Utiliser les utilitaires partagés de `@repo/shared` :
```ts
import { parseDateKey, toDateKey, getIsoWeekMonday, getIsoWeek, getIsoWeekYear } from '@repo/shared'
import { addDays } from 'date-fns'
const startDate = parseDateKey(weekStart)
const endDate = addDays(startDate, 6)
const weekEnd = toDateKey(endDate)
```

---

### H-5 — Rôle `support` : accès route `/gestion` mais lien masqué dans sidebar

**Fichiers concernés :** `src/routes/gestion.tsx` (ligne ~7), `src/components/layout/app-sidebar.tsx` (lignes ~27–28)

**Problème :** `ALLOWED_ROLES` du guard de route inclut `'support'`, mais `showAdmin` dans la sidebar n'inclut que `['validateur', 'admin']`. Un `support` peut accéder à `/gestion` directement mais ne voit jamais le lien.

**Fix — choisir l'une des deux options :**
- **Option A (recommandée)** : Ajouter `'support'` dans la condition `showAdmin` du sidebar pour rendre le comportement cohérent.
- **Option B** : Retirer `'support'` de `ALLOWED_ROLES` dans `gestion.tsx` si on décide que le support ne doit pas accéder à la gestion.

---

### H-6 — Erreurs API avalées silencieusement → UI vide sans message

**Fichier concerné :** hook `usePageData` ou pattern de chargement dans `dashboard-page.tsx` et `absences-page.tsx`

**Problème :** Les erreurs réseau ou API (401, 500) sont catchées sans message à l'utilisateur. L'interface reste vide avec les skeletons qui disparaissent — l'utilisateur ne sait pas ce qui s'est passé.

**Fix :** Dans chaque page qui charge des données avec un `try/catch` ou `.catch()` muet, appeler `notifyError('Impossible de charger les données')` dans le bloc catch. Utiliser `notifyError` de `src/lib/notify.ts` déjà disponible.

---

## BLOC 3 — MEDIUM : Qualité, performance & robustesse

### M-1 — `pending`/`processed` non memoizés dans `gestion-page.tsx`

**Fichier :** `src/components/gestion/gestion-page.tsx` (lignes ~43–44)

Remplacer :
```ts
const pending = absences.filter((a) => a.status === 'en_attente')
const processed = absences.filter((a) => a.status !== 'en_attente')
```
Par :
```ts
const pending = useMemo(() => absences.filter((a) => a.status === 'en_attente'), [absences])
const processed = useMemo(() => absences.filter((a) => a.status !== 'en_attente'), [absences])
```

---

### M-2 — `entryMap` reconstruit à chaque render de `MonthlyView`

**Fichier :** `src/components/support/monthly-view.tsx` (lignes ~110–117)

`MonthlyView` reconstruit son `entryMap` depuis `allEntries` à chaque render (boucle O(n) sur des milliers d'entrées). Le parent `SupportPage` a déjà un `entryMap` memoizé.

**Fix :** Passer l'`entryMap` déjà calculé depuis `SupportPage` → `SupportMonthAccordion` → `MonthlyView` en prop, au lieu de le reconstruire dans `MonthlyView`. Typage : `entryMap: Map<string, TimeEntry[]>`.

---

### M-3 — `projectMap` reconstruit à chaque render dans plusieurs composants

**Fichiers :** `src/components/support/collaborators-list.tsx` (ligne ~17), `src/components/timesheet/week-list.tsx` (ligne ~17)

Dans chaque fichier, wraper dans `useMemo` :
```ts
const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
```

---

### M-4 — `now` stale dans la closure `last4Weeks` du dashboard

**Fichier :** `src/components/dashboard/dashboard-page.tsx` (ligne ~118)

`now` utilisé dans `useMemo` sans être dans les deps → risque de date périmée si la session reste ouverte au passage de minuit.

**Fix :** Soit ajouter `now` dans les deps du `useMemo`, soit le dériver de façon stable :
```ts
const now = useMemo(() => new Date(), []) // une seule fois au mount
```

---

### M-5 — Incohérence `new Date(x + 'T00:00:00')` vs `parseDateKey` dans le dashboard

**Fichier :** `src/components/dashboard/dashboard-page.tsx` (ligne ~99)

Partout dans le codebase on utilise `parseDateKey(dateString)` de `@repo/shared` pour créer une Date depuis une string ISO. Le dashboard utilise `new Date(a.startDate + 'T00:00:00')` — remplacer par `parseDateKey(a.startDate)`.

---

### M-6 — Overlap half-day : logique autorise +2 demi-journées même date

**Fichier :** `src/routes/api/absence-requests/index.ts` (lignes ~98–108)

La vérification d'overlap ne compte pas le nombre de demi-journées existantes. Un user peut créer 3+ demi-journées sur la même plage.

**Fix :** Ajouter avant le check half-day :
```ts
if (overlapping.length >= 2) {
  return badRequest('Maximum 2 demi-journées par période')
}
```

---

### M-7 — `handleApprove` pas awaité dans le footer du panel de gestion

**Fichier :** `src/components/gestion/gestion-page.tsx` (ligne ~138)

```tsx
// Actuel — le panel se ferme immédiatement sans attendre la réponse
onClick={() => { handleApprove(detailTarget.id); setDetailTarget(null) }}

// Fix — attendre la réponse avant de fermer
onClick={async () => { await handleApprove(detailTarget.id); setDetailTarget(null) }}
```

---

### M-8 — `detailTarget` affiche des données périmées après refresh

**Fichier :** `src/components/gestion/gestion-page.tsx` (lignes ~71–90)

Après `load()`, le tableau `absences` est rafraîchi mais `detailTarget` pointe encore sur l'ancien objet.

**Fix :** Après le `setAbsences(fresh)`, ajouter :
```ts
setDetailTarget((prev) => prev
  ? fresh.find((a) => a.id === prev.id) ?? null
  : null
)
```

---

### M-9 — `TT_QUOTA = 10` hardcodé dans `absences-page.tsx`

**Fichier :** `src/components/absences/absences-page.tsx` (ligne ~19)

**Fix :** Déplacer la constante dans `packages/shared/src/calendar-config.ts` :
```ts
export const DEFAULT_TT_QUOTA_PER_MONTH = 10
```
L'importer dans `absences-page.tsx` depuis `@repo/shared`.

---

### M-10 — Interface `DraftEntry` définie 678 lignes après son premier usage

**Fichier :** `src/components/timesheet/pointage-page.tsx` (ligne ~750)

Extraire l'interface dans `src/components/timesheet/pointage-types.ts` et l'importer dans `pointage-page.tsx`. Cela améliorera la lisibilité et permettra de partager le type si besoin.

---

### M-11 — Heuristique fragile new/updated dans `sync.ts`

**Fichier :** `src/routes/api/projects/sync.ts` (lignes ~50–56)

La condition `|| now.getTime() - row.createdAt.getTime() < 1000` est un fallback qui peut mal classifier un projet lent à insérer comme "updated". Supprimer cette seconde condition — `createdAt === updatedAt` est suffisant et correct.

---

### M-12 — Race condition `setPendingCount` sur unmount dans `app-layout.tsx`

**Fichier :** `src/components/layout/app-layout.tsx` (lignes ~22–28)

**Problème :** Si l'utilisateur navigue avant que le fetch se termine, `setPendingCount` est appelé sur un composant démonté. De plus `.catch(() => {})` avale les erreurs d'auth.

**Fix :**
```ts
useEffect(() => {
  if (!isAdmin) return
  let cancelled = false
  api.absenceRequests
    .list({ status: 'en_attente', limit: 50 })
    .then((data) => {
      if (!cancelled) setPendingCount(Array.isArray(data) ? data.length : 0)
    })
    .catch(() => {}) // toléré ici — c'est uniquement un badge de notification
  return () => { cancelled = true }
}, [isAdmin])
```

---

## BLOC 4 — LOW : Nettoyage & dette technique

### L-1 — Supprimer les exports morts `ABSENCE_TYPE_CSS` et `ABSENCE_STATUS_CSS`

**Fichier :** `packages/shared/src/enums.ts`

Ces deux exports ne sont utilisés nulle part dans `src/`. Supprimer leur déclaration dans `enums.ts` et leur re-export dans `packages/shared/src/index.ts`.

---

### L-2 — Données jours fériés expirent fin 2027

**Fichier :** `packages/shared/src/calendar-config.ts`

`PUBLIC_HOLIDAYS` couvre 2025–2027 seulement. Ajouter les jours fériés 2028 et 2029, et insérer un commentaire explicite :
```ts
// ⚠️ À mettre à jour chaque année avant le 31/12 — couvrir currentYear + 2 minimum
```

---

### L-3 — Aucun Error Boundary dans l'arbre React

**Fichier :** `src/routes/__root.tsx`

Ajouter un composant `ErrorBoundary` autour de `<Outlet />` dans `RootComponent`. En cas de crash runtime, afficher un message "Une erreur inattendue est survenue" avec un bouton "Recharger la page" au lieu d'un écran blanc.

---

### L-4 — Composants jamais importés (code mort)

**Fichiers :**
- `src/components/timesheet/week-list.tsx` — jamais importé, la logique est inline dans `pointage-page.tsx`
- `src/components/timesheet/day-detail-panel.tsx` — jamais importé, logique inlinée dans `pointage-page.tsx`

**Fix :** Supprimer les deux fichiers après vérification que rien ne les importe (grep de sécurité).

---

### L-5 — Middleware de logging sur les assets statiques

**Fichier :** `src/start.ts`

Le middleware de logging global intercepte toutes les requêtes y compris les fonts, CSS, JS. En production les logs seront saturés.

**Fix :** Ajouter un guard :
```ts
if (!request.url.includes('/api/')) return next()
```

---

### L-6 — Breadcrumb map incomplète

**Fichier :** `src/components/layout/app-header.tsx` (lignes ~37–43)

`BREADCRUMB_MAP` ne gère que 5 routes connues. Les futures routes afficheront un slug brut en breadcrumb.

**Fix :** Ajouter une entrée par défaut dans la map et s'assurer qu'elle sera mise à jour à chaque nouvelle route, ou générer dynamiquement le label depuis le segment de chemin.

---

### L-7 — SSL et pool de connexion manquants pour la production

**Fichier :** `src/db/index.ts`

```ts
// Actuel
export const db = drizzle(process.env.DATABASE_URL, { schema })

// Fix production-ready
import { Pool } from 'pg'
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})
export const db = drizzle(pool, { schema })
```

---

## BLOC 5 — ARCHITECTURE : Modèle Pôle / Label / Taux (évolution structurelle)

> Ce bloc décrit l'évolution du modèle de données pour supporter la gestion des pôles, la facturation par taux, et la hiérarchie d'équipe. **Implémenter dans cet ordre.**

---

### A-1 — Créer la table `poles` (normalisation)

**Contexte :** Aujourd'hui le pôle est un `text` libre sur `projects` (ex: `'DEV'`, `'SUP'`). Il faut le normaliser pour établir les liens user → pôle → projets → taux.

**Migration Drizzle à créer :**
```ts
export const poles = pgTable('poles', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(), // 'DEV', 'SUP', 'INFRA'...
  name: text('name').notNull(),                              // 'Développement', 'Support'...
  color: varchar('color', { length: 7 }).notNull(),         // '#3B82F6'
  managerId: uuid('manager_id').references(() => users.id), // chef de pôle (nullable)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

**Seeder :** Pré-remplir avec les codes déjà utilisés : `SUP`, `DEV`, `DATA`, `DESIGN`, `INFRA`, `RH`, `COMM`, `FINANCE`, `JURIDIQUE` (mapping déjà présent dans `workflow-notion-sync.json`).

---

### A-2 — Ajouter `poleCode` sur la table `users`

**Migration Drizzle :**
```ts
// Dans la définition de la table users
poleCode: varchar('pole_code', { length: 20 }).references(() => poles.code),
```
Nullable — tous les users n'ont pas forcément un pôle assigné (ex: admin transversal).

**UI à créer :** Dans la page admin de gestion des utilisateurs (ou `update-user` endpoint), permettre de sélectionner le pôle depuis un `<select>` ou `ComboBox` peuplé avec `GET /api/poles`.

---

### A-3 — Créer les endpoints `GET/POST/PATCH /api/poles`

- `GET /api/poles` — public (authentifié) — liste les pôles actifs
- `POST /api/poles` — admin uniquement — crée un pôle
- `PATCH /api/poles/:id` — admin uniquement — met à jour nom, couleur, chef de pôle

Utiliser les patterns existants (`safeHandler`, `authMiddleware + requireRoles(['admin'])`).

---

### A-4 — Rattacher `projects.pole` à `poles.code` (FK soft)

Aujourd'hui `projects.pole` est un `text` libre. Le sync n8n y écrit le code pôle Notion.

**Approche :** Ne pas en faire une FK contrainte (ça bloquerait les syncs Notion si un nouveau pôle arrive). À la place :
- Garder `projects.pole` comme `text`
- Afficher dans l'UI un warning sur les projets dont `pole` n'existe pas dans `poles.code`
- Le sync n8n créera automatiquement le pôle s'il n'existe pas (endpoint `POST /api/poles` idempotent sur `code`)

---

### A-5 — Export CSV fiche de paie enrichi avec le pôle user

**Fichier :** `src/components/support/support-page.tsx` — fonction `exportCsv`

Aujourd'hui l'export inclut le pôle du **projet**. Il faut aussi inclure le pôle du **collaborateur** (via `user.poleCode`).

**Fix :** Ajouter une colonne `Pôle collaborateur` dans le CSV en utilisant le nouveau champ `user.poleCode`. Si null, afficher `'—'`.

---

### A-6 — Préparation future (ne pas implémenter maintenant) : `project_rates`

Documenter la structure prévue pour la future table de taux :
```sql
project_rates (
  id UUID PK,
  project_id UUID FK → projects.id,
  pole_code VARCHAR(20) FK → poles.code,
  hourly_rate NUMERIC(10,2),     -- taux horaire (paie)
  billing_rate NUMERIC(10,2),    -- taux horaire (facturation)
  effective_date DATE NOT NULL,  -- date de début de validité
  created_at TIMESTAMPTZ
)
```
La structure actuelle (`poles` normalisé + `users.poleCode`) est 100% compatible avec ce modèle futur sans refactoring majeur.

---

### A-7 — Préparation future (ne pas implémenter maintenant) : chef de pôle

Le champ `poles.managerId` prépare la notion de "responsable de pôle". Il pourra :
- Valider les pointages de son pôle
- Voir la vue support filtrée sur son pôle uniquement
- Recevoir des alertes hebdomadaires si des collaborateurs de son pôle n'ont pas saisi

---

## BLOC 1 — CRITICAL : Production uniquement (MSAL)

> **Ne traiter ce bloc que quand on passe en production.** En dev local avec `DEV_AUTH_BYPASS=true`, tout fonctionne tel quel.

### C-1 — Remplacer le DEV OID hardcodé par un vrai flow MSAL

**Fichier :** `src/contexts/auth-provider.tsx`

Aujourd'hui tous les utilisateurs sont loggés comme Nicolas Paradis (UUID hardcodé). Il n'y a pas de redirect OAuth.

**Fix :**
1. Installer `@azure/msal-browser`
2. Dans `AuthProvider`, remplacer le fetch initial par `msalInstance.loginRedirect({ scopes: ['User.Read'] })`
3. Au retour du redirect, appeler `msalInstance.acquireTokenSilent()` pour obtenir le token
4. Appeler `GET /api/users/me` avec `Authorization: Bearer <token>` pour résoudre l'utilisateur applicatif
5. Stocker le token dans un module-level ref accessible par `apiFetch`

---

### C-2 — Injecter le token MSAL dans toutes les requêtes API

**Fichier :** `src/lib/api.ts`

```ts
let _authToken: string | null = null
export function setAuthToken(token: string) { _authToken = token }

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...((_authToken) ? { Authorization: `Bearer ${_authToken}` } : {}),
      ...init?.headers,
    },
  })
  // ...
}
```

`AuthProvider` appelle `setAuthToken(token)` après acquisition MSAL.

---

## Règles de validation finale

Après chaque bloc implémenté, vérifier :
1. `pnpm tsc --noEmit` → 0 erreurs
2. Les routes API concernées répondent correctement aux cas nominaux ET aux cas d'erreur
3. Aucune régression sur les pages existantes (pointage, support, gestion, absences)
4. Les composants React ne créent pas de closures stales (vérifier les deps de useCallback/useMemo)
5. Pas de `console.log` de debug laissé dans le code
