# 🚀 Guide de mise en production

## Étape 1 : Vérifier le backend sur Render

### ✅ Vérifications

1. **Backend déployé** : Vérifie que ton backend est bien déployé sur Render
   - URL du backend : `https://ton-backend.onrender.com`
   - Health check : `https://ton-backend.onrender.com/health` doit retourner `{"status": "ok"}`

2. **Teste le nouvel endpoint actif** :
   ```
   GET https://ton-backend.onrender.com/stats/active?websiteId=test-site&windowMinutes=5
   ```

3. **Si le backend n'est pas encore déployé** :
   - Suis le guide dans `DEPLOY_QUICK_START.md`
   - Push les dernières modifications sur GitHub
   - Render redéploiera automatiquement

---

## Étape 2 : Intégrer dans ton vrai dashboard Next.js

### Option A : Utiliser les instructions Cursor (Recommandé)

1. **Ouvre ton projet dashboard Next.js**

2. **Copie le contenu de `dashboard-integration/CURSOR_INSTRUCTIONS.md`** dans Cursor

3. **Remplace dans le prompt** :
   - `http://localhost:3000` 
   - Par : `https://ton-backend-render.onrender.com`

4. **Cursor va créer automatiquement** :
   - Les types TypeScript
   - Les API routes Next.js
   - Les hooks/services
   - Tous les fichiers nécessaires

5. **Configure `.env.local`** dans ton dashboard :
   ```env
   ANALYTICS_BACKEND_URL=https://ton-backend-render.onrender.com
   ```

### Option B : Intégration manuelle

1. **Crée `types/analytics.ts`** (copie depuis `dashboard-integration/types-analytics.ts`)

2. **Crée les API routes** :
   - `app/api/analytics/events/route.ts` (ou `pages/api/analytics/events.ts`)
   - `app/api/analytics/stats/route.ts` (ou `pages/api/analytics/stats.ts`)
   - Utilise les fichiers dans `dashboard-integration/app-router/` ou `pages-router/`

3. **Crée les hooks/services** (voir `CURSOR_INSTRUCTIONS.md`)

4. **Crée tes composants** en utilisant les hooks

---

## Étape 3 : Ajouter l'affichage des utilisateurs actifs

Pour ajouter l'affichage des utilisateurs actifs dans ton dashboard :

### Backend

Le nouvel endpoint est déjà disponible :
```
GET /stats/active?websiteId=xxx&windowMinutes=5
```

### Frontend

Ajoute dans ton composant dashboard :

```typescript
// Hook pour les stats actives
const [activeStats, setActiveStats] = useState<{
  activeSessions: number;
  activeVisitors: number;
  windowMinutes: number;
  timestamp: number;
} | null>(null);

const fetchActiveStats = async () => {
  const res = await fetch(
    `/api/analytics/stats/active?websiteId=${websiteId}&windowMinutes=5`
  );
  const json = await res.json();
  if (json.success && json.data) {
    setActiveStats(json.data);
  }
};

useEffect(() => {
  fetchActiveStats();
  const interval = setInterval(fetchActiveStats, 10000); // Toutes les 10 secondes
  return () => clearInterval(interval);
}, [websiteId]);
```

Et ajoute une API route dans ton Next.js :
```
app/api/analytics/stats/active/route.ts
```

Qui fait simplement proxy vers le backend :
```typescript
const BACKEND_URL = process.env.ANALYTICS_BACKEND_URL;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const websiteId = searchParams.get('websiteId');
  const windowMinutes = searchParams.get('windowMinutes') || '5';

  const res = await fetch(
    `${BACKEND_URL}/stats/active?websiteId=${websiteId}&windowMinutes=${windowMinutes}`
  );
  const data = await res.json();
  return NextResponse.json(data);
}
```

---

## Étape 4 : Mettre à jour le script client (si utilisé)

Si tu utilises le script client pour tracker les sites web, mets à jour le snippet avec l'URL de production :

```html
<script>
(function(w,d,s){s=d.createElement('script');s.src='https://ton-cdn.com/steroid-analytics.js?w=site-123&d=example.com&u=https://ton-backend-render.onrender.com';s.async=1;d.head.appendChild(s)})(window,document);
</script>
```

---

## Étape 5 : Tests finaux

### Vérifications

- [ ] Backend accessible : `https://ton-backend.onrender.com/health`
- [ ] Endpoint events fonctionne : `GET /events?websiteId=xxx`
- [ ] Endpoint stats fonctionne : `GET /stats?websiteId=xxx&startDate=...&endDate=...`
- [ ] Endpoint active fonctionne : `GET /stats/active?websiteId=xxx`
- [ ] Dashboard Next.js peut se connecter au backend
- [ ] Les événements s'affichent dans le dashboard
- [ ] Les stats s'affichent correctement
- [ ] Les utilisateurs actifs se mettent à jour en temps réel

### Tests fonctionnels

1. **Envoie un événement** depuis un site tracké
2. **Vérifie qu'il apparaît** dans le dashboard
3. **Vérifie les stats** (pageviews, visiteurs, etc.)
4. **Vérifie les utilisateurs actifs** (se met à jour toutes les 10 secondes)

---

## Checklist de production

### Backend

- [ ] Déployé sur Render (ou autre plateforme)
- [ ] URL accessible publiquement
- [ ] Health check fonctionne
- [ ] Tous les endpoints fonctionnent
- [ ] Variables d'environnement configurées
- [ ] Logs accessibles

### Frontend Dashboard

- [ ] `.env.local` configuré avec l'URL du backend
- [ ] API routes Next.js créées
- [ ] Types TypeScript créés
- [ ] Hooks/services créés
- [ ] Composants dashboard créés
- [ ] Affichage des événements fonctionne
- [ ] Affichage des stats fonctionne
- [ ] Affichage des utilisateurs actifs fonctionne
- [ ] Design adapté à ton style

### Script client (si utilisé)

- [ ] Script compilé et minifié
- [ ] Hébergé sur un CDN (ou serveur accessible)
- [ ] Snippet mis à jour avec l'URL de production
- [ ] Testé sur un site réel

---

## Problèmes courants

### Le backend ne répond pas

- Vérifie que le service est "Live" sur Render (pas en sleep)
- Sur le plan gratuit, Render met les services en sleep après inactivité
- Le premier appel peut prendre ~30 secondes pour réveiller le service

### CORS errors

- Le backend a déjà `cors()` activé
- Vérifie que l'URL du backend est correcte
- Si tu as des problèmes, ajuste les CORS dans `src/index.ts`

### Les données ne s'affichent pas

- Vérifie que le `websiteId` correspond
- Vérifie la console du navigateur (erreurs réseau ?)
- Vérifie les logs du backend sur Render

### Les utilisateurs actifs ne se mettent pas à jour

- Vérifie que l'endpoint `/stats/active` fonctionne
- Vérifie la console pour les erreurs
- Vérifie que le polling est actif (interval de 10 secondes)

---

## Améliorations futures (optionnel)

- [ ] Authentification API (si besoin de sécuriser)
- [ ] Rate limiting (pour éviter les abus)
- [ ] Cache Redis (pour améliorer les performances)
- [ ] PostgreSQL au lieu de SQLite (pour mieux scaler)
- [ ] Export des données (CSV, PDF)
- [ ] Alertes/notifications (si certains seuils sont atteints)

---

🎉 **Ton système de tracking est maintenant en production !**

