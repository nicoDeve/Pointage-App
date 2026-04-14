# Prompt — Refactoring UI pixel-perfect · TanStack Start

## Contexte & objectif

Tu travailles sur **`C:\Users\nicolasParadis\CODE\pointageApp`** — une app TanStack Start (React + TypeScript strict + Tailwind v4 + shadcn/ui + Drizzle PostgreSQL).

La maquette de référence est **`C:\Users\nicolasParadis\CODE\components v0\app pointage`** — un projet Next.js avec données mockées.

**Objectif :** reproduire exactement le même UI que la maquette, composant par composant, dans le projet TanStack Start. Toutes les données viennent exclusivement de l'API réelle (`~/lib/api.ts`) — aucune donnée mockée, aucun Context de données.

---

## Règles non négociables

### Architecture

1. **Découper en sous-composants atomiques.** Toute section réutilisable ou visuellement distincte devient son propre fichier dans le bon dossier. Pas de composants de 300+ lignes.
2. **Zéro CSS inline / fichier `.css` custom.** Tout style = classes Tailwind. Si une combinaison de classes se répète 3+ fois → ajouter un `@utility` dans `src/globals.css`.
3. **Réutiliser les `@utility` existantes** de `src/globals.css` : `app-page`, `app-page-header`, `app-page-title`, `app-section-title`, `app-grid-2/3/4`, `text-label`, `text-value`, `text-hint`, `app-card`, `app-card-pad`, `app-kpi-label`, `app-kpi-value`, `app-kpi-hint`, `app-list-row`, `app-summary-box`, `status-approved/pending/rejected`, `absence-conges/teletravail/maladie/sans-solde`, `stick-full/partial/empty/absent`, etc.
4. **Importer depuis `@repo/shared`** pour tous les types, enums, constantes et utilitaires calendrier. Ne jamais redéfinir `ABSENCE_TYPES`, `ABSENCE_STATUSES`, `ABSENCE_TYPE_CSS`, `countWorkdays`, `toDateKey`, etc.
5. **Helpers communs** dans `~/lib/utils.ts` : `getUserName(u)`, `getUserInitials(u)` — ne pas les dupliquer dans les composants.
6. **`~/lib/api.ts` est déjà typé** avec les types partagés — utiliser tels quels, ne pas re-typer les retours.

### TanStack Start vs Next.js — points de différence

| Aspect | Ce projet (TanStack Start) | Maquette (Next.js — à NE PAS copier tel quel) |
|--------|---------------------------|-----------------------------------------------|
| Routing | Basé sur fichiers dans `src/routes/` via TanStack Router | `app/` directory Next.js |
| Navigation | `useNavigate()`, `useRouterState()`, `<Link>` de `@tanstack/react-router` | `useRouter()`, `<Link>` Next.js |
| Layout shell | `src/routes/__root.tsx` → `AuthProvider` → `AuthLayoutWrapper` → `AppLayout` | `app/layout.tsx` → `ThemeProvider` → `MainApp` |
| Données | `api.*` appels réels (`~/lib/api.ts`) | Contextes mockés (`TimesheetContext`, etc.) |
| Auth | `useAuth()` hook → `{ user, loading, logout }` | `AuthContext` mock |
| Rendu server | Server functions TanStack Start | Server Components Next.js |
| CSS utilities | `@utility` dans `globals.css` (Tailwind v4) | Inline Tailwind classique |
| State management | React state local + API calls | Context global |

---

## Ce que tu dois construire — vue par vue

### 0. Avant de commencer — lire ces fichiers

Lire entièrement avant de toucher quoi que ce soit :
- `src/globals.css` — toutes les `@utility` disponibles
- `packages/shared/src/enums.ts` — `ABSENCE_TYPES`, `ABSENCE_STATUSES`, `ABSENCE_TYPE_CSS`, `ABSENCE_STATUS_CSS`, `REJECT_REASON_CODES`
- `packages/shared/src/calendar.ts` — `toDateKey`, `countWorkdays`, `getIsoWeek`, `getIsoWeekMonday`, `weekTargetHours`, etc.
- `packages/shared/src/types.ts` — `User`, `Project`, `TimeEntry`, `AbsenceRequest`
- `src/lib/api.ts` — toutes les méthodes disponibles
- `src/lib/utils.ts` — `cn`, `getUserName`, `getUserInitials`
- `src/components/shared/app-badges.tsx` — tous les badges existants + `ABSENCE_TYPE_DOT_COLOR`
- `src/components/shared/app-side-panel.tsx` — interface props du panel

---

### 1. Layout Shell (`src/components/layout/`)

**Fichiers à modifier :** `app-layout.tsx`, `app-header.tsx`, `app-sidebar.tsx`

#### `app-layout.tsx`
```
<div className="flex h-screen overflow-hidden bg-background">
  <AppSidebar collapsed={sidebarCollapsed} pendingCount={pendingCount} />
  <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
    <AppHeader sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggle} />
    <main className="flex-1 overflow-y-auto">
      <Outlet />  {/* TanStack Router */}
    </main>
  </div>
</div>
```
- Fetch `api.absenceRequests.list({ status: 'en_attente' })` si rôle admin/validateur → `pendingCount`
- La `<main>` ne scroll pas elle-même — chaque page déclare `app-page` qui gère le scroll

#### `app-sidebar.tsx`

Structure exacte de la maquette :
```
<div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-56 shrink-0">
  {/* Logo block */}
  <div className="p-4 border-b border-sidebar-border">
    <div className="flex items-center gap-3">
      <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">H</div>
      {!collapsed && <p className="text-sm font-semibold truncate">Holis pointage</p>}
    </div>
  </div>

  {/* Navigation */}
  <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
    <p className="app-sidebar-section-label">Plateforme</p>
    {/* Tableau de bord — NavItem */}
    {/* Collapsible "Temps & absences" */}
      {/* → Pointage */}
      {/* → Absences */}
    <p className="app-sidebar-section-label mt-4">Administration</p>
    {/* Gestion — avec ToastPingLayer + NotificationCountPing */}
    {/* Support */}
  </nav>
</div>
```

- **Sidebar collapsed = `w-14`** (affiche icônes uniquement, pas `w-0`)
- Items actifs : `app-sidebar-item-active`, inactifs : `app-sidebar-item`
- Labels de section : `app-sidebar-section-label`
- Sous-items (Pointage/Absences) : `ml-7` + même classes d'item
- Gestion : `<div className="relative">` avec `<ToastPingLayer>` + `<NotificationCountPing count={pendingCount} variant="destructive">`

#### `app-header.tsx`
```
<header className="flex items-center justify-between px-4 h-14 border-b border-border bg-background shrink-0 gap-3">
  {/* Left: PanelLeft/PanelLeftClose toggle (ghost, size-8) + Breadcrumb 2 niveaux */}
  {/* Right: date (text-xs text-muted-foreground) + ActivityLogPopover + dark toggle (ghost size-8) + Avatar dropdown (size-8 rounded-full) */}
</header>
```

Breadcrumb map depuis `useRouterState()` :
```
/ → Plateforme / Tableau de bord
/pointage → Feuille de temps / Pointage
/absences → Feuille de temps / Absences
/gestion → Administration / Gestion
/support → Administration / Support
```

Avatar fallback : `bg-gradient-to-br from-pink-400 to-purple-500` + initiales via `getUserInitials(user)`

---

### 2. Dashboard (`src/components/dashboard/`)

Fichiers : `dashboard-page.tsx` (orchestrateur), `chart-area-interactive.tsx` (inchangé)

Structure en 4 rangées :

```
<div className="app-page">
  <div className="app-page-header"><h1 className="app-page-title">Tableau de bord</h1></div>

  {/* Row 1 — 4 KPI */}
  <div className="app-grid-4">
    <KpiCard label="Heures cumulées" value={X} unit="h" colorClass="[&>div]:bg-blue-500" hint="Depuis le 1er janvier" />
    <KpiCard label="Semaines complètes" value={X} suffix={`/ ${totalWeeks}`} colorClass="[&>div]:bg-emerald-500" hint="Semaines à objectif atteint" />
    <KpiCard label="Absences en attente" value={X} hint="..." />
    <KpiCard label="Congés payés" value={remaining} suffix={`/ ${quota} j`} colorClass="[&>div]:bg-violet-500" hint="..." />
  </div>

  {/* Row 2 — Graphique */}
  <Card className="border border-border shadow-sm">
    <CardHeader className="app-card-header-compact">
      <CardTitle className="app-section-title flex items-center gap-2">
        <TrendingUp className="size-3.5" /> Heures sur les 8 dernières semaines
      </CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4 pt-2">
      <ChartAreaInteractive entries={entries} weeksBack={8} />
    </CardContent>
  </Card>

  {/* Row 3 — 2 colonnes */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
    {/* Dernières semaines — clickable card */}
    <Card className="border border-border shadow-sm hover:border-primary/40 cursor-pointer group transition-colors" onClick={→ /pointage}>
      {/* 4 semaines avec Progress + WeekHoursStatusBadge */}
    </Card>
    {/* Mes absences */}
    <Card>
      {/* Ab listées, statut en_attente = bg-amber-500/[0.07] */}
    </Card>
  </div>

  {/* Row 4 — 2 colonnes */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
    {/* Heures par projet semaine courante */}
    {/* Actions rapides — 2×2 grid de boutons outline avec icône dans bg-muted/30 */}
  </div>
</div>
```

**`KpiCard`** — extraire `src/components/shared/kpi-card.tsx` en composant propre :
```tsx
interface KpiCardProps {
  label: string
  value: number | string
  unit?: string
  suffix?: string
  progress?: number       // 0-100, si absent → pas de barre
  colorClass?: string     // ex: "[&>div]:bg-blue-500"
  hint?: string
  loading?: boolean
}
```

Données depuis `useEffect` + `Promise.all([api.timeEntries.list(...), api.absenceRequests.list({userId}), api.projects.list()])`.  
Calcul CP : `Number(user.leaveQuota ?? 25) - approvedCPDaysThisYear`.

---

### 3. Pointage (`src/components/timesheet/`)

Fichiers : `pointage-page.tsx`, `week-list.tsx`, `day-detail-panel.tsx`

#### Vue liste (défaut)

```
<div className="app-page">
  <div className="app-page-header">
    <h1 className="app-page-title">Pointage</h1>
  </div>

  {/* Tableau semaines */}
  <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
    {weeks.map(w => <WeekRow key={...} week={w} onClick={→ vue jour} />)}
  </div>
</div>
```

`WeekRow` (`week-list.tsx`) :
```
<div className={cn(
  "group flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/30 cursor-pointer transition-colors",
  isCurrent && "border-l-4 border-l-blue-500"
)}>
  <span className="text-xs text-muted-foreground w-8 shrink-0">S{week}</span>
  <div className="flex-1 min-w-0">
    <Progress value={pct} className={cn("h-2", isComplete ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500")} />
  </div>
  <span className="text-xs tabular-nums w-20 text-right">{hours.toFixed(1)}h / {target}h</span>
  <WeekHoursStatusBadge hours={hours} target={target} />
  <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
</div>
```

#### Vue jour (après click sur semaine)

```
{/* Header fixe */}
<div className="flex items-center gap-3 px-3 py-2 border-b border-border shrink-0">
  <Button variant="ghost" size="icon" className="size-8" onClick={→ vue liste}><ArrowLeft /></Button>
  <WeekSelectorPopover value={selectedWeek} options={availableWeeks} onChange={setWeek} />
  <div className="flex-1" />
  <span className="text-xs tabular-nums text-muted-foreground">{total}h / {target}h</span>
  <Progress value={pct} className="h-1.5 w-28 [&>div]:bg-blue-500" />
  <WeekHoursStatusBadge hours={total} target={target} />
</div>

{/* Jours */}
{workdays.map(day => <DayRow key={day} ... />)}
```

`DayRow` : `<ContextMenu>` sur chaque entrée (Supprimer = `text-destructive`), inline editing avec `<Select>` projet + `<HoursInput>`, bouton `+ Ajouter` désactivé si `remainingHours <= 0`. Jours fériés = badge uniquement, pas d'édition.

---

### 4. Absences (`src/components/absences/`)

Fichiers : `absences-page.tsx`, `absence-list.tsx`, `absence-form-panel.tsx`

#### `absences-page.tsx`

```
<div className="app-page">
  <div className="app-page-header">
    <h1 className="app-page-title">Absences</h1>
    <Button className="h-9 bg-[#18181b] text-white hover:bg-[#18181b]/90 text-xs px-3" onClick={openPanel}>
      <Plus className="size-3.5 mr-1" /> Nouvelle absence
    </Button>
  </div>

  {/* 3 KPI */}
  <div className="app-grid-3">
    <KpiCard label="Congés payés" value={remainingCP} suffix={`/ ${quota} j`} progress={...} colorClass="[&>div]:bg-violet-500" hint="..." />
    <KpiCard label="Télétravail" value={remainingTT} suffix="/ 10 j" progress={...} colorClass="[&>div]:bg-sky-500" />
    <KpiCard label="Autres" value={otherCount} />
  </div>

  {/* Header liste + filtre */}
  <div className="flex items-center justify-between gap-2">
    <h2 className="text-sm font-semibold text-foreground">Demandes</h2>
    <Select value={filter} onValueChange={setFilter}>
      <SelectItem value="all">Toutes ({total})</SelectItem>
      <SelectItem value="en_attente">En attente ({n})</SelectItem>
      <SelectItem value="approuvee">Approuvées ({n})</SelectItem>
      <SelectItem value="refusee">Refusées ({n})</SelectItem>
    </Select>
  </div>

  <AbsenceList absences={filtered} onRefresh={load} />
  <AbsenceFormPanel open={panelOpen} onClose={closePanel} userId={user.id} onCreated={load} />
</div>
```

#### `absence-list.tsx`

```
<div className="border border-border rounded-lg overflow-hidden">
  <div className="divide-y divide-border">
    {absences.map(a => (
      <ContextMenu key={a.id}>
        <ContextMenuTrigger asChild>
          <div className="grid grid-cols-[1fr_auto_100px] items-center px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-default select-none">
            <div className="min-w-0 space-y-0.5">
              <AbsenceTypeColoredBadge type={a.type} />
              <p className="text-[11px] text-muted-foreground">{from} → {to}</p>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground px-2">{days}j</span>
            <div className="flex justify-center">
              <AbsenceStatusBadge status={a.status} />
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={a.status !== 'en_attente'} onClick={→ delete} className="text-destructive focus:text-destructive">
            Annuler la demande
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    ))}
  </div>
</div>
```

État vide : `<div className="flex items-center justify-center py-12"><p className="text-body-muted">Aucune absence.</p></div>`

#### `absence-form-panel.tsx`

`<AppSidePanel width="narrow" title="Demande d'absence" description="..." footer={<Button className="w-full" disabled={!isValid || saving}>Enregistrer</Button>}>`

Contenu :
1. `<Select>` type → options avec point coloré `ABSENCE_TYPE_DOT_COLOR` + label `ABSENCE_TYPES[key]`
2. `<DateRangePicker>` — `disabled={isWeeklyOff(date) || isPublicHoliday(toDateKey(date))}`
3. Bloc demi-journée : `rounded-lg border border-border bg-muted/20 px-3 py-2` + `<Checkbox>` + `<InlineHelp>`
4. Summary box (`app-summary-box`) si `range.from` : jours ouvrés + équivalent heures
5. `<Textarea>` motif — `min-h-[5.5rem] resize-none text-xs`
6. Process hint avec `<InlineHelp>`

Calcul : `countWorkdays(from, end)` depuis `@repo/shared`, `-0.5` si `halfDay`. Soumission : `api.absenceRequests.create({ type, startDate: toDateKey(from), endDate: toDateKey(end), halfDay, comment })`.

---

### 5. Gestion (`src/components/gestion/`)

Fichiers : `gestion-page.tsx`, `pending-requests-list.tsx`, `journal-tab.tsx`, `reject-dialog.tsx` (inchangé)

#### `gestion-page.tsx`

- `Promise.all([api.absenceRequests.list(), api.users.list()])` → `usersById` map
- 2 onglets : "Demandes en attente" (badge count inline `size-5 rounded-full bg-primary text-[10px]`) + "Journal"
- `AppSidePanel` detail (width="narrow") avec footer Approuver/Refuser si `en_attente`
- `RejectDialog` pour le refus

#### `pending-requests-list.tsx`

Groupement par `user.poste` (= pôle) :
```
{groups.map(([pole, reqs]) => (
  <div key={pole}>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
      {pole} <span className="font-normal normal-case">({reqs.length})</span>
    </p>
    <div className="divide-y divide-border rounded-lg border overflow-hidden">
      {reqs.map(r => (
        <ContextMenu>
          <div className="group flex items-center gap-3 bg-card px-3 py-2.5 hover:bg-muted/40 cursor-default select-none transition-colors">
            {/* Avatar 8×8 gradient pink→purple initiales */}
            {/* Nom (getUserName) + AbsenceTypeColoredBadge */}
            {/* Dates + durée */}
            {/* Boutons approve (vert) + reject (destructive) + ChevronRight group-hover */}
          </div>
        </ContextMenu>
      ))}
    </div>
  </div>
))}
```

ContextMenu : "Voir le détail", separator, "Approuver" (vert), "Refuser" (destructive)

#### `journal-tab.tsx`

Même layout bordered `divide-y`, avec avatar + nom (`getUserName`) + `AbsenceTypeColoredBadge` + `AbsenceStatusBadge` + dates + date de traitement.

---

### 6. Support (`src/components/support/`)

Fichiers : `support-page.tsx`, `monthly-view.tsx`, `collaborators-list.tsx`

#### `support-page.tsx`

- Nav mois : `ChevronLeft / {label} / ChevronRight` (label capitalized avec `fr` locale)
- `app-grid-4` : 4 `KpiCard` (Heures totales, Objectif, Taux %, Membres)
- **N+1 corrigé :** `Promise.all(users.map(u => api.timeEntries.list(u.id, start, end))).then(r => r.flat())`
- Export CSV et Pennylane avec `getUserName(usr)` au lieu de `usr.id.slice(0,8)`
- `Tabs` : Mensuel | Collaborateurs

#### `monthly-view.tsx`

Légende : `stick-full` · `stick-partial` · `stick-empty` · `stick-absent` (classes `@utility`)

Par utilisateur :
```
<div className="app-card app-card-pad">
  <div className="flex items-center justify-between mb-2">
    {/* Avatar + getUserName(usr) + total heures */}
  </div>
  <div className="flex items-center gap-[2px]">
    {days.map(day => isOff ? <div className="h-5 w-1.5 sm:w-2" /> : <div className={stickClass} title="..." />)}
  </div>
</div>
```

Classes stick : `stick-full` = heures ≥ `HOURS_PER_WORKDAY`, `stick-partial` = heures > 0, `stick-empty` = 0h, `stick-absent` = entrée d'absence.

#### `collaborators-list.tsx`

Par utilisateur : `app-card app-card-pad` → nom (`getUserName(usr)`) + poste + `{total}h / {target}h` + `Progress h-1.5` + `{pct}%` + liste projets avec `Progress h-1` colorée selon `project.color`.

---

## Composants partagés à vérifier / compléter

### `src/components/shared/app-side-panel.tsx`
Interface attendue :
```ts
interface AppSidePanelProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  width?: 'narrow' | 'default' | 'wide'   // narrow = sm:max-w-[min(100vw-2rem,22rem)]
  size?: 'narrow' | 'default' | 'wide'    // alias de width
  footer?: ReactNode
  banner?: ReactNode
  children: ReactNode
  className?: string
}
```
Layout : `flex flex-col gap-0 p-0` → header (border-b) → `flex-1 overflow-y-auto overscroll-contain px-3 py-2` → footer optionnel (border-t, shrink-0)

### `src/components/shared/app-badges.tsx`
Badges à avoir (tous via `Badge variant="outline"`) :

| Composant | Classes |
|-----------|---------|
| `AbsenceTypeBadge` | `bg-[#18181b] text-white hover:bg-[#18181b] text-xs font-normal border-0` |
| `AbsenceStatusBadge` approuvee | `bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 text-xs font-normal` |
| `AbsenceStatusBadge` en_attente | `bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs font-normal` |
| `AbsenceStatusBadge` refusee | `bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 text-xs font-normal` |
| `AbsenceTypeColoredBadge` conges_payes | `bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-normal` |
| `AbsenceTypeColoredBadge` teletravail | `bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300 text-xs font-normal` |
| `AbsenceTypeColoredBadge` maladie | `bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 text-xs font-normal` |
| `AbsenceTypeColoredBadge` sans_solde | `bg-muted text-muted-foreground hover:bg-muted border-border text-xs font-normal` |
| `WeekHoursStatusBadge` complet | `variant="outline" border-green-500/50 text-green-700 dark:text-green-400 text-xs font-normal` |
| `WeekHoursStatusBadge` incomplet | `variant="outline" border-red-400/50 text-red-600 dark:text-red-400 text-xs font-normal` |

Labels depuis `@repo/shared` : `ABSENCE_TYPES[type]`, `ABSENCE_STATUSES[status]`.

### `src/components/shared/kpi-card.tsx`
Composant réutilisable :
```tsx
<Card className="border border-border shadow-sm">
  <CardContent className="p-4 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <span className="app-kpi-label">{label}</span>
      {icon && <Icon className="size-3.5 text-muted-foreground shrink-0" />}
    </div>
    {loading ? <Skeleton className="h-8 w-24" /> : (
      <>
        <div className="flex items-baseline gap-1">
          <span className="app-kpi-value">{value}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
        </div>
        {progress != null && <Progress value={progress} className={cn("h-1 bg-muted", colorClass)} />}
        {hint && <p className="app-kpi-hint">{hint}</p>}
      </>
    )}
  </CardContent>
</Card>
```

---

## Globals.css — nouvelles classes à ajouter si nécessaire

Si tu identifies des patterns répétés non couverts par les `@utility` existantes, ajoute-les dans `src/globals.css` sous le bloc correspondant. **Ne jamais créer un fichier `.css` séparé.**

---

## Validation finale

Après chaque fichier modifié, vérifier : `pnpm tsc --noEmit`. Corriger toutes les erreurs TypeScript avant de passer au suivant. Tolérance : 0 erreur, 0 `any` non justifié.

---

## Ce qu'il NE FAUT PAS toucher

- `src/db/schema.ts` (sauf bug réel)
- `src/routes/api/**` (backend intact)
- `src/middleware/auth.ts`
- `packages/shared/**`
- `src/lib/api.ts` (déjà typé)
- `src/lib/validators/**`
- `drizzle.config.ts`
- `src/routes/__root.tsx` (sauf layout bugs)
- `src/components/ui/**` (composants shadcn générés)
