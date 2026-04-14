# Intégration n8n + Notion → Sync Projets

## Architecture

```
Notion (DB Projets)
       │
       ▼  (trigger : polling ou webhook)
   ┌───────┐
   │  n8n  │  workflow automatisé
   └───┬───┘
       │  POST /api/projects/sync
       ▼
  pointageApp
```

**Principe** : n8n lit la base Notion, transforme les données, puis appelle l'endpoint `POST /api/projects/sync` qui fait un upsert batch en base PostgreSQL.

---

## Étapes d'implémentation

### 1. Préparer Notion

- Créer une **intégration interne** sur https://www.notion.so/my-integrations
  - Nom : `pointageApp-sync`
  - Capabilities : « Read content »
- Partager la base de données Projets avec l'intégration (Share → Invite)
- Noter le **Database ID** (dans l'URL : `notion.so/{workspace}/{database_id}?v=…`)
- Vérifier les propriétés de la DB Notion :
  | Propriété Notion | Type      | Mapping pointageApp |
  |------------------|-----------|---------------------|
  | Nom              | Title     | `name`              |
  | Couleur          | Select    | `color`             |
  | Pôle             | Select    | `pole`              |
  | Actif            | Checkbox  | `isActive`          |
  | *(ID de page)*   | —         | `externalSourceId`  |

### 2. Installer & configurer n8n

```bash
# Self-hosted (Docker)
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=<mot_de_passe> \
  n8nio/n8n

# Ou n8n Cloud : https://app.n8n.cloud
```

### 3. Créer le workflow n8n

#### Nœud 1 — Trigger (Schedule / Webhook)

- **Option A – Schedule Trigger** : cron toutes les 15 min ou toutes les heures
- **Option B – Notion Trigger** : « Database Page Updated » (polling Notion)
- **Option C – Webhook** : déclenché manuellement ou via un bouton Notion

#### Nœud 2 — Notion : Query Database

- **Credential** : Notion Internal Integration Token
- **Database ID** : `{votre_database_id}`
- **Filter** (optionnel) : `Actif == true` si vous ne voulez que les projets actifs
- **Sort** : par date de modification (pour traiter les plus récents en premier)

#### Nœud 3 — Code (transformation)

```javascript
// Transformer les pages Notion en payload pour /api/projects/sync
const projects = $input.all().map(item => {
  const props = item.json.properties
  return {
    name: props['Nom']?.title?.[0]?.plain_text ?? 'Sans nom',
    color: props['Couleur']?.select?.name ?? '#6B7280',
    pole: props['Pôle']?.select?.name ?? null,
    isActive: props['Actif']?.checkbox ?? true,
    externalSourceId: item.json.id, // ID de la page Notion
  }
})

return [{ json: { projects } }]
```

> **Note** : adapter les noms de propriétés (`Nom`, `Couleur`, `Pôle`, `Actif`) aux noms exacts de votre DB Notion.

#### Nœud 4 — HTTP Request : POST /api/projects/sync

- **Method** : POST
- **URL** : `https://{votre-domaine}/api/projects/sync`
- **Authentication** : Header Auth
  - Header Name : `Authorization`
  - Header Value : `Bearer {token_admin}`
- **Body** : `{{ $json }}`
- **Content-Type** : `application/json`

#### Nœud 5 (optionnel) — Slack / Email notification

- Envoyer un résumé : « Sync terminée : X créés, Y mis à jour »

---

### 4. Sécuriser l'endpoint sync

L'endpoint `POST /api/projects/sync` est protégé par le middleware `requireApiKey` qui valide le header `X-API-Key` contre la variable d'environnement `SYNC_API_KEY` (comparaison timing-safe).

**Setup :**

1. Ajouter dans votre `.env` :
   ```
   SYNC_API_KEY=8632881fbadabc01f11cd70c23d7ae4d67c8ac744692172d81a705a3759aed10
   ```
   (ou générer une nouvelle clé : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

2. Dans n8n, configurer le nœud HTTP Request avec un **Header Auth** :
   - Header Name : `X-API-Key`
   - Header Value : `{votre_clé_SYNC_API_KEY}`

---

### 5. Mapping des couleurs

Si Notion stocke les couleurs sous forme de noms (ex: `blue`, `red`), créer un mapping vers les hex :

```javascript
const NOTION_COLOR_MAP = {
  default: '#6B7280',
  gray: '#9CA3AF',
  brown: '#A1887F',
  orange: '#FB923C',
  yellow: '#FACC15',
  green: '#4ADE80',
  blue: '#60A5FA',
  purple: '#C084FC',
  pink: '#F472B6',
  red: '#F87171',
}

// Dans le nœud Code :
color: NOTION_COLOR_MAP[props['Couleur']?.select?.color] ?? '#6B7280'
```

---

### 6. Tests

1. **Tester le workflow manuellement** dans n8n (bouton « Test Workflow »)
2. Vérifier dans l'app que les projets apparaissent
3. Modifier un projet dans Notion → lancer le workflow → vérifier la mise à jour
4. Ajouter un nouveau projet → vérifier la création
5. Désactiver un projet (Actif = false) → vérifier que `isActive` passe à `false`

### 7. Monitoring

- Activer les **logs d'exécution** dans n8n (Settings → Executions)
- Configurer une notification (Slack/email) en cas d'échec du workflow
- Surveiller le endpoint `/api/projects/sync` via les logs serveur (`[API]` prefix)

---

## Résumé du flux de données

```
Notion DB ──[n8n polling/webhook]──► n8n workflow
                                        │
                                        ├── Query Notion pages
                                        ├── Transform → { projects: [...] }
                                        ├── POST /api/projects/sync
                                        └── Notification (optionnel)
                                        │
                                        ▼
                               pointageApp DB
                          (upsert batch sur externalSourceId)
```

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/routes/api/projects/sync.ts` | Endpoint de sync (batch upsert) |
| `src/lib/validators/projects.ts` | Schéma Zod pour la validation |
| `src/db/schema.ts` | Table `projects` avec `externalSourceId` |
| `src/middleware/roles.ts` | Protection `requireRoles(['admin'])` |
