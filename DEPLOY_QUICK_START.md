# 🚀 Déploiement rapide en production (Gratuit)

## Option la plus simple : Render (5 minutes)

### Étapes

1. **Push ton code sur GitHub** (si pas déjà fait)

2. **Va sur https://render.com** et connecte-toi avec GitHub

3. **Créer un nouveau Web Service**
   - Clique sur "New +" → "Web Service"
   - Sélectionne ton repo `steroid-analytics`

4. **Configuration**
   - **Name** : `steroid-analytics-backend`
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Plan** : `Free`

5. **Variables d'environnement** (dans l'interface Render)
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render utilise ce port)

6. **Déployer**
   - Clique sur "Create Web Service"
   - Attends 2-3 minutes pour le déploiement

7. **Récupérer l'URL**
   - Une fois déployé, Render donne une URL comme :
   - `https://steroid-analytics-backend.onrender.com`

### ✅ C'est fait !

Teste avec : `https://ton-url.onrender.com/health`

---

## Alternative : Railway (encore plus simple)

1. Va sur https://railway.app
2. Clique sur "New Project" → "Deploy from GitHub repo"
3. Sélectionne ton repo
4. Railway détecte automatiquement Node.js et déploie
5. Récupère l'URL générée automatiquement

**C'est tout !** Railway gère tout automatiquement.

---

## Après déploiement

### 1. Mettre à jour le dashboard Next.js

Dans `.env.local` de ton dashboard :
```env
ANALYTICS_BACKEND_URL=https://ton-url.onrender.com
```

### 2. Mettre à jour le snippet client

Dans le snippet à coller dans les sites web :
```html
<script>
(function(w,d,s){s=d.createElement('script');s.src='https://ton-cdn.com/steroid-analytics.js?w=site-123&d=example.com&u=https://ton-url.onrender.com';s.async=1;d.head.appendChild(s)})(window,document);
</script>
```

Remplace `https://ton-url.onrender.com` par l'URL réelle de ton backend.

---

## Notes importantes

- ⚠️ **SQLite et données** : Sur Render (plan gratuit), les données peuvent être perdues lors des redémarrages. Pour une vraie persistance, utilise Railway ou passe à PostgreSQL (gratuit aussi).

- 🔄 **Mises à jour** : Push sur GitHub → déploiement automatique (si configuré)

- 📊 **Logs** : Disponibles dans le dashboard de Render/Railway

- 🔒 **HTTPS** : Automatique sur toutes les plateformes

- 💰 **Coût** : Gratuit avec limitations raisonnables (plus que suffisant pour débuter)

---

## Dépannage

**Le backend ne démarre pas ?**
- Vérifie les logs dans le dashboard Render/Railway
- Assure-toi que `npm start` fonctionne en local
- Vérifie que le PORT est bien configuré (10000 pour Render)

**Les données disparaissent ?**
- Normal sur Render avec SQLite (système de fichiers éphémère)
- Solution : Utilise Railway (persiste mieux) ou PostgreSQL

**CORS errors ?**
- Le backend a déjà `cors()` activé
- Vérifie que l'URL du backend est correcte dans le dashboard

