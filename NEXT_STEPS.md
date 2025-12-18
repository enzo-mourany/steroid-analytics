# 🎉 Prochaines étapes après le déploiement

Ton backend est maintenant déployé sur Render ! Voici ce qu'il faut faire maintenant.

## 1. ✅ Vérifier que le backend fonctionne

Teste l'endpoint de health check :

```
GET https://ton-url.onrender.com/health
```

Tu devrais recevoir :
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-12-17T..."
  }
}
```

## 2. 🔗 Intégrer dans ton dashboard Next.js

### Option A : Si tu utilises les instructions Cursor

Ouvre le fichier `dashboard-integration/CURSOR_INSTRUCTIONS.md` et copie-le dans Cursor de ton projet Next.js dashboard.

**Important** : Avant de copier, remplace dans le prompt :
- `ANALYTICS_BACKEND_URL=http://localhost:3000` 
- Par : `ANALYTICS_BACKEND_URL=https://ton-url.onrender.com`

Cursor va créer tous les fichiers nécessaires automatiquement.

### Option B : Configuration manuelle

Dans ton projet dashboard Next.js :

1. **Crée/modifie `.env.local`** :
```env
ANALYTICS_BACKEND_URL=https://ton-url.onrender.com
```

2. **Suis le guide d'intégration** dans `dashboard-integration/README.md`

## 3. 📝 Mettre à jour le snippet client

Le script client doit pointer vers ton backend en production.

Dans le snippet à coller dans les sites web, remplace :

```html
<script>
(function(w,d,s){s=d.createElement('script');s.src='https://ton-cdn.com/steroid-analytics.js?w=site-123&d=example.com&u=https://ton-url.onrender.com';s.async=1;d.head.appendChild(s)})(window,document);
</script>
```

**Important** : Remplace `https://ton-url.onrender.com` par ton URL Render réelle.

## 4. 🧪 Tester l'intégration complète

### Test 1 : Envoyer un événement depuis le client

1. Intègre le snippet dans une page de test
2. Ouvre la page dans un navigateur
3. Ouvre la console du navigateur (F12)
4. Vérifie qu'il n'y a pas d'erreurs

### Test 2 : Vérifier dans le backend

Appelle l'endpoint pour lister les événements :

```
GET https://ton-url.onrender.com/events?websiteId=test-site&limit=10
```

Tu devrais voir les événements qui viennent d'être envoyés.

### Test 3 : Vérifier les statistiques

```
GET https://ton-url.onrender.com/stats?websiteId=test-site&startDate=2024-01-01&endDate=2024-12-31
```

## 5. 📊 Utiliser le dashboard

Une fois l'intégration faite dans ton dashboard Next.js :

1. Ouvre ton dashboard
2. Sélectionne un `websiteId`
3. Choisis une plage de dates
4. Les statistiques devraient s'afficher

## 6. 🔒 Sécurisation (optionnel mais recommandé)

### Ajouter des restrictions CORS

Si tu veux limiter les domaines autorisés à appeler ton backend, modifie `src/index.ts` :

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
};

app.use(cors(corsOptions));
```

Puis dans Render, ajoute la variable d'environnement :
```
ALLOWED_ORIGINS=https://ton-dashboard.com,https://www.ton-dashboard.com
```

### Ajouter une authentification (optionnel)

Si tu veux protéger les endpoints de lecture, tu peux ajouter une authentification basique.

## 7. 📈 Monitoring

- **Logs** : Disponibles dans le dashboard Render (section "Logs")
- **Métriques** : Render affiche CPU, mémoire, etc.
- **Redémarrages** : Render redémarre automatiquement en cas de crash

## 8. 🗄️ Gestion de la base de données

### Important : SQLite sur Render (plan gratuit)

Sur Render avec le plan gratuit :
- Les données peuvent être perdues lors des redémarrages
- Le système de fichiers est éphémère

### Solutions pour la persistance :

1. **Railway** (recommandé) : Meilleure persistance avec SQLite
2. **PostgreSQL gratuit** : 
   - Vercel Postgres (256 MB gratuit)
   - Supabase (500 MB gratuit)
   - Render Postgres (gratuit avec limitations)

Pour passer à PostgreSQL, il faudra adapter le code (utiliser `pg` au lieu de `better-sqlite3`).

## 9. 🚀 Mises à jour

Pour mettre à jour le backend :

1. Fais tes modifications en local
2. Teste avec `npm run dev`
3. Push sur GitHub
4. Render redéploie automatiquement (si configuré)
5. Vérifie les logs dans Render pour confirmer le déploiement

## 10. ✅ Checklist finale

- [ ] Backend déployé et accessible (health check OK)
- [ ] Dashboard Next.js intégré avec l'URL de production
- [ ] Snippet client mis à jour avec l'URL de production
- [ ] Test d'envoi d'événement réussi
- [ ] Données visibles dans le dashboard
- [ ] Logs vérifiés (pas d'erreurs)

## 🆘 En cas de problème

### Le backend ne répond pas
- Vérifie les logs dans Render
- Vérifie que le service est "Live" (pas en sleep)
- Sur le plan gratuit, Render met les services en sleep après inactivité

### Les événements ne s'affichent pas
- Vérifie la console du navigateur (erreurs CORS ?)
- Vérifie les logs du backend (erreurs de validation ?)
- Vérifie que le `websiteId` est correct

### Le dashboard ne charge pas les données
- Vérifie que `ANALYTICS_BACKEND_URL` est correct dans `.env.local`
- Vérifie la console du navigateur (erreurs réseau ?)
- Vérifie que les API routes Next.js fonctionnent

---

🎉 **Félicitations ! Ton système de tracking est maintenant en production !**

