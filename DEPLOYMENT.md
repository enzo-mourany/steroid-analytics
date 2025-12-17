# Guide de déploiement en production - Backend Steroid Analytics

Ce guide explique comment déployer le backend en production de manière gratuite.

## Options gratuites recommandées

1. **Render** ⭐ (Recommandé - Le plus simple)
2. **Railway** ⭐⭐ (Très bon, généreux en crédits)
3. **Fly.io** ⭐⭐⭐ (Excellent pour apps persistantes)
4. **Vercel** (Limité pour SQLite, mais possible)

---

## Option 1 : Render (Recommandé - Le plus simple)

### Avantages
- Gratuit avec limitations raisonnables
- Support SQLite (fichier système)
- Déploiement automatique depuis GitHub
- HTTPS automatique
- Custom domain gratuit

### Étapes

1. **Créer un compte sur Render** : https://render.com (connexion avec GitHub)

2. **Préparer le projet pour Render**

Crée un fichier `render.yaml` à la racine du projet :

```yaml
services:
  - type: web
    name: steroid-analytics-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    plan: free
```

3. **Modifier le code pour Render**

Modifie `src/config.ts` pour utiliser le PORT de Render :

```typescript
export const defaultConfig: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  // ... reste de la config
};
```

4. **Adapter la base de données pour Render**

Render utilise un système de fichiers éphémère, donc SQLite fonctionne mais les données seront perdues au redémarrage. Pour une solution persistante gratuite, utilise PostgreSQL (voir section alternative ci-dessous).

OU modifie pour utiliser un chemin persistant :

```typescript
// src/config.ts
database: {
  path: process.env.DATABASE_PATH || './analytics.db'
}
```

Et dans Render, ajoute une variable d'environnement :
```
DATABASE_PATH=/opt/render/project/src/analytics.db
```

5. **Déployer sur Render**

- Va sur https://dashboard.render.com
- Clique sur "New +" → "Web Service"
- Connecte ton repo GitHub
- Sélectionne le repo `steroid-analytics`
- Configure :
  - **Name** : `steroid-analytics-backend`
  - **Environment** : `Node`
  - **Build Command** : `npm install && npm run build`
  - **Start Command** : `npm start`
  - **Plan** : Free
- Ajoute les variables d'environnement :
  - `NODE_ENV=production`
  - `PORT=10000` (Render utilise ce port)
- Clique sur "Create Web Service"

6. **Récupérer l'URL**

Une fois déployé, Render donne une URL comme : `https://steroid-analytics-backend.onrender.com`

**Utilise cette URL dans ton `.env.local` du dashboard** :
```env
ANALYTICS_BACKEND_URL=https://steroid-analytics-backend.onrender.com
```

---

## Option 2 : Railway (Très bon - Crédits gratuits généreux)

### Avantages
- $5 de crédits gratuits par mois (plus que suffisant)
- Déploiement ultra-simple
- Support SQLite et PostgreSQL
- HTTPS automatique

### Étapes

1. **Créer un compte sur Railway** : https://railway.app

2. **Déployer depuis GitHub**

- Clique sur "New Project"
- Sélectionne "Deploy from GitHub repo"
- Sélectionne ton repo
- Railway détecte automatiquement Node.js

3. **Configurer**

- Railway détecte automatiquement `npm start`
- Ajoute une variable d'environnement :
  - `PORT` = sera automatiquement défini par Railway
  - `NODE_ENV=production`

4. **Base de données**

SQLite fonctionne avec Railway. Les données persistent.

OU utilise PostgreSQL gratuitement :
- Clique sur "New" → "Database" → "Add PostgreSQL"
- Railway crée automatiquement une variable `DATABASE_URL`
- Tu peux adapter le code pour utiliser PostgreSQL si besoin (optionnel)

5. **Récupérer l'URL**

Railway génère automatiquement une URL comme : `https://steroid-analytics-production.up.railway.app`

**Utilise cette URL dans ton dashboard**.

---

## Option 3 : Fly.io (Excellent pour apps persistantes)

### Avantages
- Vraiment gratuit (3 VMs gratuites)
- Excellent pour les apps avec fichiers persistants
- Performance élevée
- Global edge network

### Étapes

1. **Installer Fly CLI**

```bash
# macOS
curl -L https://fly.io/install.sh | sh

# OU avec Homebrew
brew install flyctl
```

2. **Se connecter**

```bash
fly auth login
```

3. **Initialiser l'app**

```bash
cd /Users/enzomourany/General/codes/steroid-analytics
fly launch
```

Réponds aux questions :
- App name : `steroid-analytics-backend` (ou choisis un nom)
- Region : choisis le plus proche (ex: `cdg` pour Paris)
- PostgreSQL ? Non (on utilise SQLite)
- Redis ? Non

4. **Créer un `Dockerfile`** (si pas déjà créé)

Crée `Dockerfile` à la racine :

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Builder
RUN npm run build

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
```

5. **Modifier `fly.toml`** (généré par `fly launch`)

Assure-toi que la section `[http_service]` est correcte :

```toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
```

6. **Déployer**

```bash
fly deploy
```

7. **Récupérer l'URL**

```bash
fly status
```

L'URL sera quelque chose comme : `https://steroid-analytics-backend.fly.dev`

**Utilise cette URL dans ton dashboard**.

---

## Option 4 : Vercel (Possible mais limité pour SQLite)

### Problème
Vercel utilise des fonctions serverless, donc SQLite (fichier système) ne fonctionne pas bien car chaque invocation est isolée.

### Solution alternative
Utilise Vercel avec une base de données externe (Vercel Postgres gratuit, ou PlanetScale, ou Supabase).

---

## Configuration pour la production

### 1. Variables d'environnement

Crée un fichier `.env.production` (ou configure dans l'interface de déploiement) :

```env
NODE_ENV=production
PORT=3000
ANALYTICS_BACKEND_URL=https://ton-backend.com
```

### 2. Modifier `src/index.ts` pour utiliser le PORT de l'environnement

```typescript
const PORT = process.env.PORT ? parseInt(process.env.PORT) : config.port;
```

### 3. Gérer CORS (si nécessaire)

Le backend a déjà `cors()` activé, mais tu peux restreindre pour la production :

```typescript
// src/index.ts
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
};

app.use(cors(corsOptions));
```

Puis dans les variables d'environnement de production :
```
ALLOWED_ORIGINS=https://ton-dashboard.com,https://www.ton-dashboard.com
```

### 4. Logs

Les plateformes de déploiement capturent automatiquement les logs via `console.log`. C'est déjà géré dans le code.

---

## Base de données persistante gratuite (Optionnel)

Si tu veux une vraie base de données persistante (au lieu de SQLite) :

### Option A : Vercel Postgres (Gratuit)
- 256 MB gratuit
- Connecte-toi à Vercel, crée une Postgres DB
- Adapte le code pour utiliser PostgreSQL (nécessite des modifications)

### Option B : Supabase (Gratuit)
- 500 MB gratuit
- PostgreSQL
- Facile à utiliser

### Option C : PlanetScale (Gratuit)
- MySQL compatible
- 5 GB gratuit
- Très performant

**Note** : Pour l'instant, SQLite fonctionne très bien avec Render/Railway/Fly.io car ils maintiennent le système de fichiers.

---

## Recommandation finale

Pour débuter rapidement : **Render** (Option 1)
- Le plus simple
- Déploiement en 5 minutes
- Gratuit
- Fonctionne avec SQLite

Pour une solution plus robuste : **Railway** (Option 2)
- Interface très intuitive
- Crédits gratuits généreux
- Support excellent

Pour performance maximale : **Fly.io** (Option 3)
- Vraiment gratuit
- Performance élevée
- Plus de contrôle

---

## Après déploiement

1. **Tester l'endpoint health** :
```
GET https://ton-backend.onrender.com/health
```

2. **Mettre à jour le dashboard** :
Modifie `.env.local` dans ton projet Next.js :
```env
ANALYTICS_BACKEND_URL=https://ton-backend.onrender.com
```

3. **Mettre à jour le snippet client** :
Dans le snippet à coller dans les sites, utilise l'URL de production :
```html
<script>
(function(w,d,s){s=d.createElement('script');s.src='https://ton-cdn.com/steroid-analytics.js?w=site-123&d=example.com&u=https://ton-backend.onrender.com';s.async=1;d.head.appendChild(s)})(window,document);
</script>
```

---

## Maintenance

- Les plateformes redémarrent automatiquement en cas de crash
- Les logs sont disponibles dans le dashboard de la plateforme
- Pour mettre à jour : push sur GitHub → déploiement automatique (si configuré)

