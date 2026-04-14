# Déploiement sur Vercel — Holis Pointage

## Prérequis

- Compte GitHub
- Compte Vercel (gratuit)
- Base PostgreSQL en production (Neon recommandé, gratuit)
- App Registration Entra ID configurée

---

## 1. Base de données PostgreSQL (Neon)

1. Aller sur [neon.tech](https://neon.tech) → créer un projet
2. Copier la **connection string** :
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/pointage?sslmode=require
   ```
3. Appliquer le schéma :
   ```bash
   DATABASE_URL="postgresql://..." pnpm db:push
   ```
4. (Optionnel) Seeder les données initiales :
   ```bash
   DATABASE_URL="postgresql://..." pnpm db:seed
   ```

---

## 2. Git + GitHub

```bash
git init
git add .
git commit -m "Initial commit — Holis Pointage"
git remote add origin https://github.com/TON_USER/pointage-app.git
git push -u origin main
```

---

## 3. Vercel — Créer le projet

1. Aller sur [vercel.com](https://vercel.com) → "Add New Project"
2. Importer le repo GitHub
3. Vercel détecte automatiquement le framework (Vite + Nitro)
4. **Build settings** (normalement auto-détectés) :
   - Build Command : `pnpm build`
   - Output Directory : `.output`
   - Install Command : `pnpm install`

---

## 4. Variables d'environnement (Vercel)

Dans Settings → Environment Variables, ajouter :

| Variable          | Valeur                             | Scope      |
| ----------------- | ---------------------------------- | ---------- |
| `DATABASE_URL`    | `postgresql://...@neon.tech/...`   | Production |
| `ENTRA_TENANT_ID` | Ton tenant ID Azure AD             | Production |
| `ENTRA_CLIENT_ID` | Le client ID de l'App Registration | Production |
| `NODE_ENV`        | `production`                       | Production |
| `SYNC_API_KEY`    | Clé hex 64 chars (pour n8n)        | Production |

> **IMPORTANT** : Ne PAS ajouter `DEV_AUTH_BYPASS` en production.

---

## 5. Entra ID — Configurer les redirect URIs

Dans Azure Portal → App Registrations → Ton app :

1. **Authentication** → Add platform → "Single-page application"
2. Ajouter les redirect URIs :
   - `https://ton-app.vercel.app` (production)
   - `http://localhost:3000` (dev)
3. **Token configuration** → Ajouter les claims optionnels :
   - `email`, `preferred_username` dans le token ID
4. **API Permissions** → Ajouter :
   - `User.Read` (Microsoft Graph)

---

## 6. MSAL — Intégration client (BLOQUANT pour prod)

Le serveur valide déjà les JWT Entra ID. Il manque le côté **client** (MSAL)
pour envoyer le token `Bearer` dans les requêtes.

### a. Installer MSAL

```bash
pnpm add @azure/msal-browser
```

### b. Créer `src/lib/msal.ts`

```ts
import { PublicClientApplication } from '@azure/msal-browser'

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

export const loginScopes = ['User.Read']

export async function getAccessToken(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length === 0) return null

  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes: [`api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`],
      account: accounts[0],
    })
    return result.accessToken
  } catch {
    // Token expiré → redirect login
    await msalInstance.acquireTokenRedirect({
      scopes: [`api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`],
    })
    return null
  }
}
```

### c. Brancher dans `AuthProvider`

```ts
import { msalInstance, loginScopes, getAccessToken } from '~/lib/msal'
import { setAccessTokenGetter } from '~/lib/api'

// Au mount du AuthProvider :
await msalInstance.initialize()
await msalInstance.handleRedirectPromise()

const accounts = msalInstance.getAllAccounts()
if (accounts.length === 0) {
  await msalInstance.loginRedirect({ scopes: loginScopes })
} else {
  setAccessTokenGetter(getAccessToken)
  // Puis fetchCurrentUser() comme d'habitude
}
```

### d. Variables Vercel supplémentaires

| Variable                | Valeur         |
| ----------------------- | -------------- |
| `VITE_ENTRA_CLIENT_ID`  | Même client ID |
| `VITE_ENTRA_TENANT_ID`  | Même tenant ID |

> Les variables `VITE_` sont exposées côté client par Vite.

---

## 7. Déployer

```bash
git add .
git commit -m "feat: deploy config Vercel + Nitro"
git push
```

Vercel déploie automatiquement sur chaque push vers `main`.

---

## 8. Vérification post-deploy

1. Ouvrir `https://ton-app.vercel.app`
2. Vérifier la redirection MSAL → login Microsoft
3. Vérifier que `/api/auth/me` retourne le user
4. Vérifier que les time entries se chargent
5. Vérifier le sync n8n : `POST /api/projects/sync` avec header `x-api-key`

---

## 9. Domaine custom (optionnel)

1. Vercel → Settings → Domains → Ajouter `pointage.holis.fr` (ou autre)
2. Configurer le DNS : CNAME vers `cname.vercel-dns.com`
3. Mettre à jour le redirect URI dans Entra ID
4. Mettre à jour `VITE_ENTRA_CLIENT_ID` redirect URIs si nécessaire

---

## Migrations DB post-deploy

Pour appliquer des changements de schéma sur Neon :

```bash
# Générer le SQL de migration
DATABASE_URL="postgresql://..." pnpm db:generate

# Appliquer directement (dev rapide)
DATABASE_URL="postgresql://..." pnpm db:push

# Ou appliquer les migrations SQL
DATABASE_URL="postgresql://..." pnpm db:migrate
```

---

## Rollback

Vercel garde chaque déploiement. Pour revenir :
- Vercel Dashboard → Deployments → cliquer "Promote to Production" sur un ancien deploy
