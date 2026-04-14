# REFACTOR PROMPT V2 — Audit pixel-perfect & alignement front/back

> Contexte technique : TanStack Start · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui · Drizzle PostgreSQL · `@repo/shared` (types/enums/calendar utils)

> La source de vérité est la maquette Next.js : `C:\Users\nicolasParadis\CODE\components v0\app pointage`. Ce document décrit **tous les écarts restants** entre la maquette et l'app TanStack Start actuelle, composant par composant.

---

## Table des matières

1. [Conventions globales](#1-conventions-globales)
2. [Layout : Header](#2-layout--header)
3. [Layout : Sidebar](#3-layout--sidebar)
4. [Dashboard (page d'accueil)](#4-dashboard)
5. [Pointage — vue liste semaines](#5-pointage--vue-liste-semaines)
6. [Pointage — vue jours (day view)](#6-pointage--vue-jours)
7. [Pointage — panel jour (AppSidePanel)](#7-pointage--panel-jour)
8. [Absences](#8-absences)
9. [Gestion (admin)](#9-gestion-admin)
10. [Support](#10-support)
11. [User name — Microsoft Entra ID](#11-user-name--microsoft-entra-id)
12. [Patterns réutilisables](#12-patterns-réutilisables)
13. [Alignement front ↔ back](#13-alignement-front--back)

---

## 1. Conventions globales

### 1.1 Pas de titre de page H1

La maquette ne contient **aucun** `<h1>` / `app-page-title` en haut des pages. Chaque page commence directement par ses KPI ou son contenu principal (tabs, barre d'outils, etc.).

**Tous les fichiers suivants doivent perdre le bloc `app-page-header` + `app-page-title` :**

| Fichier | Bloc à supprimer |
|---------|-----------------|
| `dashboard-page.tsx` | `<h1>Tableau de bord</h1>` si encore présent |
| `pointage-page.tsx` | `<div class="app-page-header"><h1>Pointage</h1></div>` |
| `absences-page.tsx` | `<div class="app-page-header"><h1>Absences</h1>…</div>` |
| `gestion-page.tsx` | `<div class="app-page-header"><h1>Gestion</h1></div>` |
| `support-page.tsx` | `<div class="app-page-header"><h1>Support</h1>…</div>` |

> Règle : le container racine de chaque page est `<div className={uiDensity.pageStack}>` (= `flex flex-col gap-3`). Le premier enfant est directement le contenu utile (KPI grid, tabs, toolbar…).

### 1.2 Tokens de densité

La maquette utilise `uiDensity.*` de façon cohérente :

```ts
pageStack:         'flex flex-col gap-3'
gridGap:           'gap-2'
cardPad:           'p-4'
listRowCompact:    'px-3 py-2.5'
sectionTitle:      'app-section-title'   // text-xs font-semibold uppercase tracking-wide
```

→ Vérifier que chaque page utilise bien `uiDensity.pageStack` au lieu d'un `gap-4` ou `space-y-4` hard-codé.

### 1.3 Pattern « passé grisé »

La maquette applique `opacity-40 hover:opacity-100` sur les lignes de semaines passées. Ce pattern doit être réutilisable partout (pointage, support, gestion).

**Règle CSS / className :**
```tsx
const pastRowClass = cn(
  "opacity-40 hover:opacity-100 transition-opacity",
  // Si incomplet + passé → bordure rouge en plus :
  isPastIncomplete && "border-l-2 border-l-red-400",
)
```

---

## 2. Layout : Header

**Fichier :** `src/components/layout/app-header.tsx`

### Écarts par rapport à la maquette

| Propriété | Actuel | Maquette |
|-----------|--------|----------|
| Padding | `px-4 h-14` | `px-6 py-3` (pas de h-14 fixe) |
| Date | `text-xs text-muted-foreground` simple texte | `CalendarDays` icon (lucide) + `text-foreground font-medium` (date proéminente) |
| Theme toggle | `variant="ghost" size="icon" className="size-8"` | `variant="outline" className="h-9 w-9"` |
| Avatar trigger | `variant="ghost" className="flex items-center gap-2 h-8 px-2"` avec nom | `variant="ghost" className="h-9 w-9 rounded-full p-0"` — avatar seulement, pas de nom visible |
| Avatar size | `size-6` | `h-8 w-8` dans le bouton, bouton `h-9 w-9` |
| Dropdown | `w-48`, pas d'email, pas de toggle thème | `w-56`, affiche nom + email, contient un toggle thème en item, `DropdownMenuSeparator` |
| ActivityLog | Présent ✓ | Présent ✓ |

### Code cible

```tsx
<header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background shrink-0 gap-3">
  {/* Left: sidebar toggle + breadcrumb */}
  <div className="flex items-center gap-2 min-w-0">
    <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8 shrink-0">
      {sidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
    </Button>
    <Breadcrumb>…</Breadcrumb>
  </div>

  {/* Right: date + activity + theme + avatar */}
  <div className="flex items-center gap-2 shrink-0">
    {/* Date proéminente avec icône */}
    <div className="hidden sm:flex items-center gap-1.5 text-foreground">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{displayDate}</span>
    </div>

    <ActivityLogPopover />

    {/* Theme toggle = outline h-9 w-9 */}
    <Button variant="outline" size="icon" onClick={toggleTheme} className="h-9 w-9">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>

    {/* Avatar = ghost rounded-full h-9 w-9 p-0 (pas de nom) */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.imageUrl ?? undefined} />
            <AvatarFallback className="text-xs bg-linear-to-br from-pink-400 to-purple-500 text-white">
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme}>
          {isDark ? <Sun className="size-4 mr-2" /> : <Moon className="size-4 mr-2" />}
          {isDark ? 'Mode clair' : 'Mode sombre'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
          <LogOut className="size-4 mr-2" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</header>
```

**Import à ajouter :** `CalendarDays` de `lucide-react`.

---

## 3. Layout : Sidebar

**Fichier :** `src/components/layout/app-sidebar.tsx`

### Écarts par rapport à la maquette

| Propriété | Actuel | Maquette |
|-----------|--------|----------|
| Collapsed width | `w-14` (montre les icônes) | `w-0 overflow-hidden` (complètement masqué) |
| Company row | Pas de `ChevronsUpDown` | A `ChevronsUpDown` icon à droite du nom |
| Subtitle | `text-[10px] text-sidebar-foreground/50` = "Enterprise" ✓ | Idem ✓ |
| Sub-items indent | `ml-7` | `ml-7 mt-1 py-1.5` |
| Transition | `duration-200` | Identique ✓ |

### Changements requis

1. **Collapsed = `w-0 overflow-hidden`** au lieu de `w-14` :
```tsx
collapsed ? 'w-0 overflow-hidden' : 'w-56'
```
Quand la sidebar est collapsed, **rien** n'est visible — le toggle est dans le header.

2. **Ajouter `ChevronsUpDown`** dans le bloc logo :
```tsx
import { ChevronsUpDown } from 'lucide-react'
// ...
{!collapsed && (
  <div className="flex flex-col overflow-hidden flex-1">
    <span className="text-sm font-semibold truncate">Holis pointage</span>
    <span className="text-[10px] text-sidebar-foreground/50">Enterprise</span>
  </div>
)}
{!collapsed && <ChevronsUpDown className="size-4 text-sidebar-foreground/40 shrink-0" />}
```

3. **Sub-items : ajouter `mt-1 py-1.5`** aux items sous "Temps & absences" :
```tsx
<div className="space-y-0.5 ml-7 mt-1">
  <Link … className="… py-1.5">Pointage</Link>
  <Link … className="… py-1.5">Absences</Link>
</div>
```

---

## 4. Dashboard

**Fichier :** `src/components/dashboard/dashboard-page.tsx`

### Écarts restants

1. **Titre `<h1>Tableau de bord</h1>`** — S'il est encore présent, supprimer le bloc `app-page-header`.
2. **Container racine** doit être `<div className={uiDensity.pageStack}>` (= `flex flex-col gap-3`), pas `app-page`.
3. **KPI grid** : `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2` (la maquette utilise `gap-2`).

> Le dashboard a été refait récemment et est globalement bon. Vérifier simplement :
> - Pas de h1 title
> - Container = `uiDensity.pageStack` (pas `app-page` qui a `gap-4 p-4`)
> - `gap-2` sur le grid KPI (pas `gap-3`)

---

## 5. Pointage — vue liste semaines

**Fichier :** `src/components/timesheet/pointage-page.tsx`

### Différences majeures

Le composant actuel est un monolithique `<button>` simple par semaine. La maquette est **beaucoup plus riche**.

### 5.1 Barre d'outils (tabs + search + filtres)

La maquette a, en haut de la liste :

```
[Liste | Calendrier]               [🔍 Recherche…] [⏳ Filtres (badge count)]
```

**Actuel :** uniquement un champ de recherche, pas de tabs Liste/Calendrier, pas de filtres.

**Requis :**
- `Tabs` avec `TabsList` > `TabsTrigger value="liste"` (icône `List`) + `TabsTrigger value="calendrier"` (icône `Calendar`)
- Champ de recherche `Input` avec `Search` icon, `h-9 pl-9`
- `Popover` "Filtres" avec badge count, contenant :
  - Filtre Mois (Select des mois civils ISO)
  - Filtre Période (grid 2×2 : Toutes / Courante / Passées / À venir)
  - Filtre Projet (Select des projets avec color dot)
  - Filtre Absences (flex : Toutes / Avec / Sans)
  - Footer "Appliquer les filtres"
- Pastilles actives sous la barre (Badge avec bouton X)

### 5.2 Ligne de semaine (week row)

**Actuel :** `<button>` avec flex simple → identité gauche, progress+hours+badge à droite.

**Maquette :** Grid `grid-cols-[1fr_88px_32px]` avec :

```
| Identité semaine                           | Heures+Statut | Chevron |
| ├─ "Semaine {n}" + badges (En cours/etc.)  | 35h/35h       | >       |
| ├─ dates "lun. 29 sept. – ven. 3 oct."     | Badge statut  |         |
| └─ HoverCard badges (3 activités, 1 abs.)  |               |         |
```

**Écarts clés :**
- Grid `grid-cols-[1fr_88px_32px]` au lieu de flex
- `uiDensity.listRowCompact` pour le padding
- **Semaine courante** : `bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500 hover:bg-blue-100/65`
- **Passée incomplète** : `border-l-2 border-l-red-400 opacity-40 hover:opacity-100`
- **Passée complète** : `opacity-40 hover:opacity-100` (pas de bordure rouge)
- **Future** : normal, pas d'opacity
- HoverCard au survol des badges activités/absences → popup "Semaine N" avec détail projet par projet
- Badges "X activité(s)" + "X absence(s)" avec `variant="outline"` et couleurs distinctes
- **Chevron** : `ChevronRight` avec `group-hover:translate-x-0.5`
- **Heures** empilées : `{total}h/{target}h` + `WeekHoursStatusBadge` en dessous (flex-col items-end gap-1.5)
- **ContextMenu** au clic droit → "Ouvrir le détail de la semaine"

### 5.3 Container

```tsx
<div className="border border-border rounded-lg overflow-hidden">
  <div className="divide-y divide-border">
    {filteredWeeks.map(week => …)}
  </div>
</div>
```

### Actions requises

1. **Supprimer** le `app-page-header` / `<h1>Pointage</h1>`
2. **Ajouter** la barre d'outils avec Tabs, Search, Filter Popover
3. **Réécrire** le rendu de chaque semaine pour utiliser le grid 3 colonnes
4. **Ajouter** HoverCard, ContextMenu, badges activités/absences
5. **Appliquer** le pattern passé grisé (opacity-40)
6. **Calculer** les stats par semaine (nombre de projets distincts, nombre d'absences, dates civiles)

---

## 6. Pointage — vue jours

**Fichier :** `src/components/timesheet/pointage-page.tsx` (vue `day`)

### Différences majeures

**Actuel :** chaque jour est un bloc avec un header + des drafts editables inline (Select + HoursInput + Save button par jour).

**Maquette :** chaque jour est une **ligne cliquable** dans un tableau. Cliquer sur un jour ouvre le **panel latéral** (AppSidePanel). Il n'y a PAS d'édition inline dans la vue jours.

### 6.1 Header de la vue jours

La maquette a un header dans un container `border border-border rounded-lg` :

```
┌─────────────────────────────────────────────────────────────────────┐
│ [←] [WeekSelectorPopover ▼] [Badge En cours]    35h/35h ████ [✓]  │
│                               bg-muted/30 border-b                 │
├─────────────────────────────────────────────────────────────────────┤
│ Lundi  29 sept.   [Projet1] [Projet2]          7h / 7h      >     │
│ Mardi  30 sept.   [Projet1]                    3.5h / 7h    >     │
│ ...                                                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Layout du header :**
```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-border bg-muted/30">
  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
    <Button variant="ghost" size="icon" className="h-9 w-9">
      <ArrowLeft className="h-4 w-4" />
    </Button>
    <WeekSelectorPopover … />
    {/* Badges En cours / Passée / À venir */}
  </div>
  <div className="flex items-center gap-3">
    <div className="text-right">
      <p className="text-sm font-bold">{effectiveTotal}h <span className="text-xs font-normal text-muted-foreground">/ {target}h</span></p>
      <Progress value={…} className="h-1.5 w-28 bg-muted …" />
    </div>
    <WeekHoursStatusBadge status={…} />
  </div>
</div>
```

### 6.2 Lignes jour

Chaque jour est un `grid grid-cols-[1fr_auto_90px_32px]` :

```tsx
<div className="grid grid-cols-[1fr_auto_90px_32px] items-center px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40 group"
     onClick={() => handleDayClick(day)}>
  {/* Col 1: Label jour "Lundi" + date "29 sept." */}
  <div>
    <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
    <span className="text-[11px] tabular-nums text-muted-foreground ml-1.5">{formatted date}</span>
  </div>

  {/* Col 2: Badges projets (chips avec color dot) */}
  <div className="flex items-center gap-1.5 pr-4 flex-wrap">
    {projects.slice(0, 3).map(p => (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border bg-background text-foreground/70">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
        {p.name}
      </span>
    ))}
  </div>

  {/* Col 3: Heures "7h / 7h" */}
  <div className="text-center">
    <span className="text-sm font-semibold …">{formatHours}</span>
    <span className="text-xs text-muted-foreground"> / 7h</span>
  </div>

  {/* Col 4: Chevron */}
  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 mx-auto" />
</div>
```

**Cas spéciaux :**
- **Absence approuvée** : `bg-muted/20 opacity-80`, Badge type absence au lieu des projets, 7h/7h, pas de chevron cliquable
- **Jour férié** : `bg-muted/25`, Badge "Férié · {nom}", "—" au lieu de heures, pas cliquable
- **ContextMenu** au clic droit : "Ouvrir ce jour"

### Actions requises

1. **Supprimer** l'édition inline par jour (les champs Select/HoursInput/Save intégrés dans chaque jour)
2. **Réécrire** la vue jours comme un tableau de lignes cliquables (grid 4 colonnes)
3. Le **clic sur un jour** ouvre le `AppSidePanel` (panel latéral) — voir section 7
4. Le header doit utiliser `bg-muted/30 border-b` avec le WeekSelectorPopover + Progress + badge

---

## 7. Pointage — panel jour (AppSidePanel)

La maquette utilise `AppSidePanel` (narrow) pour l'édition des heures d'un jour :

```tsx
<AppSidePanel
  open={isDayPanelOpen}
  onOpenChange={setIsDayPanelOpen}
  panelKind="timesheet-day-edit"
  width="narrow"
  banner={isPastWeek ? <div className="…">Semaine passée</div> : undefined}
  title={<span>Lundi <span className="text-[11px] text-muted-foreground">· 29 septembre 2026</span></span>}
  description="Semaine ISO 40 · lun. 28 sept. – ven. 2 oct. 2026"
  footer={<Button className="h-9 w-full text-xs">Enregistrer</Button>}
>
  {/* Summary box : week progress */}
  <div className="app-summary-box mb-4">
    <div className="app-summary-row mb-2">
      <span className="app-summary-label">Avancement semaine</span>
      <span className="app-summary-value text-xs">{total}h / {target}h · {remaining}h dispo</span>
    </div>
    <Progress … />
  </div>

  {/* Entries list */}
  <div className="space-y-3">
    {dayEntries.map(entry => (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
        <Select … className="h-8 text-xs" />
        <HoursInput value={entry.hours} … />
        <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 /></Button>
      </div>
    ))}

    <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed …">
      <Plus /> Ajouter une activité
    </button>

    {/* Total jour */}
    <div className="app-summary-row pt-2">
      <span className="app-summary-label">Total journée</span>
      <span className="text-sm font-semibold tabular-nums">{dayHours}h / 7h</span>
    </div>
  </div>
</AppSidePanel>
```

### Actions requises

Le `DayDetailPanel` existant est utilisé dans la vue `day` actuelle — il faut le remplacer par un panel qui s'ouvre quand on clique sur une ligne jour dans la vue jours (pas quand on clique « Ajouter » en bas d'un jour).

---

## 8. Absences

**Fichier :** `src/components/absences/absences-page.tsx`

### Écarts par rapport à la maquette

1. **Titre H1 "Absences"** — SUPPRIMER le bloc `app-page-header`
2. **Bouton "Nouvelle absence"** — Actuel : dans le `app-page-header` en haut de page. Maquette : dans la section liste, à côté du titre "Mes demandes" et du filtre.

### Layout cible (maquette)

```tsx
<div className={uiDensity.pageStack}>
  {/* KPI cards (déjà OK avec KpiCard) */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
    <KpiCard … />
    <KpiCard … />
    <KpiCard … />
  </div>

  {/* Section liste */}
  <div className="flex flex-col gap-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className={cn(uiDensity.sectionTitle, "text-sm sm:text-base")}>Mes demandes</h2>
      <div className="flex items-center gap-2">
        {/* BOUTON ICI — pas en haut de page */}
        <Button
          onClick={() => setPanelOpen(true)}
          className="h-9 bg-[#18181b] px-3 text-xs text-white hover:bg-[#18181b]/90"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nouvelle absence
        </Button>
        <Select value={filter} …>…</Select>
      </div>
    </div>

    {/* Liste */}
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="divide-y divide-border">
        {filteredAbsences.map(absence => (
          <div className={cn("grid grid-cols-[1fr_auto_100px] items-center", uiDensity.listRowCompact)}>
            <div className="min-w-0">
              <AbsenceTypeBadge label={absence.typeLabel} />
              <p className="text-xs text-muted-foreground mt-1">{dates}</p>
            </div>
            <span className="pr-4 text-xs tabular-nums">{absence.duration} j</span>
            <div className="flex justify-center">
              <AbsenceStatusBadge status={absence.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>

  <AbsenceFormPanel … />
</div>
```

### Actions requises

1. Supprimer `app-page-header` et `<h1>Absences</h1>`
2. Déplacer le `<Button>` "Nouvelle absence" dans la section liste (à côté du titre "Mes demandes" et du filtre)
3. Container racine = `uiDensity.pageStack` au lieu de `app-page`
4. Liste dans un container `border border-border rounded-lg overflow-hidden` > `divide-y divide-border`
5. Chaque absence = grid `grid-cols-[1fr_auto_100px]` avec `uiDensity.listRowCompact`
6. ContextMenu sur chaque absence (clic droit : "Supprimer" si en_attente)

---

## 9. Gestion (admin)

**Fichier :** `src/components/gestion/gestion-page.tsx`

### Écarts

1. **Titre H1 "Gestion"** — SUPPRIMER le `app-page-header`
2. Container racine = `uiDensity.pageStack`
3. Ombre du TabsList : la maquette ajoute `rounded-lg bg-muted p-1` + `data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs` sur chaque TabsTrigger
4. Badge count dans l'onglet "Demandes en attente" = `bg-primary text-primary-foreground rounded-full` (OK si déjà fait)
5. Les demandes sont groupées par pôle dans la maquette. Si le backend ne fournit pas de pôle, regrouper par type ou afficher sans regroupement mais utiliser `uiDensity.listRowCompact`
6. Section panel latéral : le panel actuel est OK dans sa structure, vérifier que les tokens `appSidePanelTokens.*` sont bien utilisés

### Actions requises

1. Supprimer `app-page-header` + h1
2. Container = `uiDensity.pageStack`
3. Vérifier le style des TabsTrigger (cf. maquette admin-view.tsx)

---

## 10. Support

**Fichier :** `src/components/support/support-page.tsx` + `monthly-view.tsx` + `collaborators-list.tsx`

### État actuel vs maquette

**C'est le plus gros écart de l'app.** Le support actuel fait ~170 lignes avec un simple mois nav + 4 KpiCard + tabs basiques. La maquette fait **~1840 lignes** avec :

### 10.1 Structure globale (maquette)

```
┌─ Tabs: [Mensuel | Collaborateurs]                    ──────────────┐
│                                                                     │
│  Barre: [Search] [Filtres] [PériodePicker] [Export CSV]            │
│                                                                     │
│  ┌─ MENSUEL TAB ──────────────────────────────────────────────────┐ │
│  │ Accordion par mois (mois courant en tête) :                    │ │
│  │  Octobre 2026 ▼  [7 membres · 5 complets · 2 retard] [CSV]   │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │ Cross-table: users × week slices                        │  │ │
│  │  │ Header: Collab | S40(2j) | S41 | S42 | S43 | S44 | Tot │  │ │
│  │  │ Row: M.Dupont  | ██     | ██  | ██  | ██  | ██  | 154h │  │ │
│  │  │ (WeekDaySticks: 5 bâtons colorés par cellule)           │  │ │
│  │  │ Footer: Total  | 98h    | 210h| ...                     │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ COLLABORATEURS TAB ──────────────────────────────────────────┐ │
│  │ Table: Avatar | Nom/Rôle | Projets(badges) | CP/TT(tooltip)   │ │
│  │        | Heures(progress) | Statut(badge) | ContextMenu       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ Détail panel (AppSidePanel) ─────────────────────────────────┐ │
│  │ Tabs: [Hebdomadaire | Profil]                                 │ │
│  │ Hebdomadaire: accordion semaines → accordion jours → projets  │ │
│  │ Profil: KPIs, projets, absences, infos                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Period Picker

Popover avec sélecteur de mois. La maquette a un `reportMonthId` state + un `Popover` avec :
- Portée (Tous / Jusqu'au courant / Passés uniquement)
- Grille de boutons mois (2 colonnes par année)
- Badge "Courant" sur le mois actuel

### 10.3 Tab Mensuel — Structure

Pour chaque mois (accordion) :
- Header : label mois + stats (X membres · Y complets · Z à compléter) + bouton Export
- Contenu :
  - **Cross-table** (responsive avec overflow-x-auto) :
    - Header row : "Collaborateur" + colonnes semaines (S40, S41, etc.) + "Total"
    - Chaque cellule semaine = `WeekDaySticks` component (5 petits bâtons verticaux, verts si rempli, rouge si vide, gris si hors mois)
    - Footer row : totaux par semaine
  - **Légende** en bas du tableau (LegendStick components)

### 10.4 WeekDaySticks component

```tsx
function WeekDaySticks({ sticks }: { sticks: StickDay[] }) {
  return (
    <div className="flex items-end gap-px h-5">
      {sticks.map((s, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full transition-all',
            s.filled ? 'bg-green-500 h-full' : 'bg-red-400/60 h-3',
            s.outside && 'bg-muted h-2',
            s.absent && 'bg-violet-400 h-full',
            s.holiday && 'bg-muted h-1.5',
          )}
          title={s.label}
        />
      ))}
    </div>
  )
}
```

### 10.5 Tab Collaborateurs

Table avec colonnes :
- Avatar (h-8 w-8 initials fallback)
- Nom + rôle (text-xs)
- Projets : badges `variant="outline"` (max 2, +N)
- CP / TT : avec Tooltips (détail des jours)
- Heures : `{total}h / {target}h` + Progress bar mini
- Statut : Badge coloré (Complet / Incomplet / En retard)
- ContextMenu : "Voir détail" / "Voir profil" / "Exporter"

### 10.6 Detail panel

`AppSidePanel` avec tabs "Hebdomadaire" / "Profil" :

**Hebdomadaire** :
- Summary box (heures totales / target)
- Accordion par semaine → clic déplie jours → clic jour déplie projets
- WeekDaySticks dans le header de chaque semaine

**Profil** :
- KPIs (heures, semaines, absences)
- Projets avec dégradé de progress bars
- Absences collapsibles
- Infos (rôle, département)

### Actions requises

1. **Supprimer** le titre H1 et le `app-page-header`
2. **Réécrire complètement** `support-page.tsx` :
   - Tabs Mensuel / Collaborateurs
   - Period picker popover
   - Export CSV (existant, garder la logique)
3. **Réécrire complètement** `monthly-view.tsx` :
   - Accordion par mois
   - Cross-table (users × weeks) avec WeekDaySticks
   - Légende
   - Totaux par semaine en footer
4. **Réécrire complètement** `collaborators-list.tsx` :
   - Table avec avatar, projets badges, CP/TT tooltips, status badge
   - ContextMenu
5. **Créer** un detail panel (AppSidePanel) avec tabs Hebdomadaire / Profil

> **Note :** Le support est la page la plus complexe. Il est recommandé de :
> 1. D'abord créer le `WeekDaySticks` component réutilisable
> 2. Puis réécrire monthly-view avec la cross-table
> 3. Puis réécrire collaborators-list
> 4. Puis le detail panel
> 5. Enfin assembler le tout dans support-page

---

## 11. User name — Microsoft Entra ID

### Problème actuel

Le champ `user.name` est souvent null/vide car il n'est pas renseigné lors du login. Il faut récupérer le nom complet depuis Microsoft Entra ID (Graph API).

### Solution

Lors du flow d'authentification (MSAL / Entra ID), après obtention du token, faire un appel au Microsoft Graph API :

```ts
// Dans le flow de login / auth provider
const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
  headers: { Authorization: `Bearer ${accessToken}` },
})
const profile = await graphResponse.json()
const displayName = profile.displayName  // ex: "Nicolas Paradis"
const email = profile.mail || profile.userPrincipalName
```

Ensuite persister `name` et `email` dans la table `users` (Drizzle) lors de la première connexion ou à chaque login.

### Changements requis

1. **Auth provider** (`src/contexts/auth-provider.tsx`) : après login MSAL, appeler Graph API `/me` et sauver `displayName` + `mail`
2. **Route API login/callback** : updater `users.name` dans la DB
3. **Schema Drizzle** : `name` existe déjà (colonne text nullable) — juste le remplir
4. **Header** : afficher `user.name` au lieu de fallbacks

---

## 12. Patterns réutilisables

### 12.1 Past row graying (réutilisé partout)

```ts
// utils ou un helper file
export function pastRowCn(isPast: boolean, isPastIncomplete?: boolean) {
  return cn(
    isPast && "opacity-40 hover:opacity-100 transition-opacity",
    isPast && isPastIncomplete && "border-l-2 border-l-red-400",
  )
}
```

Usage :
- Pointage week list : semaines passées
- Pointage day view : pas utilisé sur les jours individuels
- Support monthly view : semaines passées dans la cross-table
- Gestion : demandes traitées dans le journal

### 12.2 Week status classes

```ts
// Déjà dans WeekHoursStatusBadge mais standardiser
export function weekStatusCn(status: 'complet' | 'incomplet' | 'absent' | string) {
  switch (status) {
    case 'complet': return 'text-green-500 border-green-500/50'
    case 'incomplet': return 'text-red-400 border-red-400/50'
    case 'absent': return 'text-violet-400 border-violet-400/50'
    default: return 'text-muted-foreground'
  }
}
```

### 12.3 Day hours text color

```ts
export function dayHoursTextClass(hours: number, target = 7) {
  if (hours >= target) return 'text-green-600 dark:text-green-400'
  if (hours > 0) return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}
```

### 12.4 Section title

Utiliser `uiDensity.sectionTitle` partout (= `app-section-title` = `text-xs font-semibold uppercase tracking-wide`).

---

## 13. Alignement front ↔ back

### 13.1 Routes API existantes

| Route | Method | Description | OK? |
|-------|--------|-------------|-----|
| `/api/time-entries` | GET | `list(userId, from, to)` | ✅ |
| `/api/time-entries` | POST | `create({userId, projectId, workDate, duration, startTime?})` | ✅ |
| `/api/time-entries/:id` | PATCH | `update(id, {…})` | ✅ |
| `/api/time-entries/:id` | DELETE | `delete(id)` | ✅ |
| `/api/time-entries/week-summary` | GET | `weekSummary(userId, year, week)` | ✅ |
| `/api/absence-requests` | GET | `list({userId?})` | ✅ |
| `/api/absence-requests` | POST | `create({…})` | ✅ |
| `/api/absence-requests/:id` | GET | `get(id)` | ✅ |
| `/api/absence-requests/:id/approve` | POST | `approve(id)` | ✅ |
| `/api/absence-requests/:id/reject` | POST | `reject(id, {rejectReasonCode, rejectComment?})` | ✅ |
| `/api/absence-requests/pending` | GET | `listPending()` | ✅ |
| `/api/projects` | GET | `list(activeOnly?)` | ✅ |
| `/api/projects` | POST | `create(…)` | ✅ |
| `/api/projects/:id` | PATCH | `update(id, …)` | ✅ |
| `/api/projects/notion/sync` | POST | Notion sync | ✅ |
| `/api/users` | GET | `list()` | ✅ |
| `/api/users/:id` | GET | `get(id)` | ✅ |
| `/api/users/:id` | PATCH | `update(id, {…})` | ✅ |

### 13.2 Données manquantes pour la maquette

| Besoin maquette | Source back | Action |
|----------------|-------------|--------|
| Nombre projets actifs par user | Calcul front via `entries + projects` | OK |
| Nom user (Entra ID) | `users.name` | Section 11 |
| Email user | `users` table — champ `email` existe dans le schéma | Remplir via Entra ID |
| Pôle / département user | Non dans le schéma | Ajouter colonne `department` à users si besoin support |
| Rôle display (Designer, Dev…) | `users.poste` | ✅ Existe |
| Leave quota (CP) | `users.leaveQuota` | ✅ Existe |
| TT quota | Hardcodé à 10 | OK pour l'instant |
| Jours fériés | Calcul frontend via `@repo/shared` | ✅ |
| `halfDay` sur absence | `absence_requests.halfDay` | ✅ Existe |
| `comment` sur absence | `absence_requests.comment` | ✅ Existe |
| Reject reason + comment | `absence_requests.rejectReasonCode` + `rejectComment` | ✅ Existe |
| `processedAt` / `processedBy` | `absence_requests.processedAt` + `processedBy` | ✅ Existe |

### 13.3 Schema columns à vérifier

```sql
-- users
name        TEXT       -- ← remplir via Entra ID
email       TEXT       -- ← remplir via Entra ID (si pas déjà fait)
poste       TEXT       -- ✅ existe
leaveQuota  INT        -- ✅ existe
roles       TEXT[]     -- ✅ existe

-- absence_requests
halfDay     BOOLEAN    -- ✅ existe
comment     TEXT       -- ✅ existe
rejectReasonCode TEXT  -- ✅ existe
rejectComment TEXT     -- ✅ existe
processedAt TIMESTAMP  -- ✅ existe
processedBy TEXT       -- ✅ existe
```

### 13.4 Colonnes potentiellement manquantes

Pour le support complet comme dans la maquette, il faudrait potentiellement :
- `users.department` : pour grouper les collaborateurs par département (Produit / Tech / Infra / Design)
- `users.imageUrl` : URL de l'avatar (récupérable aussi via Graph API `/me/photo`)

Ces ajouts sont optionnels pour la V2 — le support peut fonctionner sans département en utilisant `poste` ou sans avatar en utilisant les initiales.

---

## Résumé des priorités

| # | Composant | Effort | Impact |
|---|-----------|--------|--------|
| 1 | Header (px-6 py-3, CalendarDays, outline theme, avatar round) | S | Haut |
| 2 | Sidebar (w-0 collapsed, ChevronsUpDown) | S | Haut |
| 3 | Supprimer tous les H1 + app-page-header | XS | Haut |
| 4 | Pointage list view (grid, HoverCard, filtres, past graying) | L | Haut |
| 5 | Pointage day view (lignes cliquables + AppSidePanel) | M | Haut |
| 6 | Absences (bouton déplacé dans section liste) | S | Moyen |
| 7 | Gestion (supprimer H1, cleanup) | XS | Faible |
| 8 | Support (réécriture complète) | XL | Haut |
| 9 | User name Entra ID | M | Moyen |

> XS = < 15 min · S = 15-30 min · M = 30 min-1h · L = 1-2h · XL = 2-4h
