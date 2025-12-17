# Steroid Analytics

Backend de collecte d'événements pour le tracking web, avec script client de tracking intégré.

## Architecture

- **Backend** : API Node.js/TypeScript pour recevoir et stocker les événements
- **Client** : Script JavaScript à intégrer dans les sites web pour tracker les événements

## Fonctionnalités

- ✅ Ingestion d'événements multi-types (pageview, custom, identify, payment, external_link)
- ✅ Support multi-site/multi-tenant
- ✅ Détection et filtrage des bots
- ✅ Validation et ignore des événements non autorisés
- ✅ Throttling des pageviews (évite les doublons)
- ✅ Déduplication des paiements
- ✅ Endpoints de consultation (liste d'événements, statistiques)
- ✅ Health check endpoint
- ✅ Base de données SQLite

## Installation

```bash
# Installer les dépendances
npm install

# Compiler le TypeScript
npm run build

# Démarrer le serveur
npm start

# Ou en mode développement avec rechargement automatique
npm run dev
```

Le serveur démarre par défaut sur le port 3000.

## Configuration

La configuration par défaut se trouve dans `src/config.ts`. Vous pouvez la modifier pour ajuster :

- Le port du serveur
- Le chemin de la base de données
- Les limites de validation (taille max, nombre de paramètres custom, etc.)
- Les règles d'ignore (localhost, file protocol, iframes)
- Le throttling des pageviews (fenêtre de temps)

## API Endpoints

### POST /events

Ingestion d'un événement.

**Body:**
```json
{
  "websiteId": "site-123",
  "domain": "example.com",
  "type": "pageview",
  "href": "https://example.com/page",
  "referrer": "https://google.com",
  "viewport": { "width": 1920, "height": 1080 },
  "visitorId": "visitor-123",
  "sessionId": "session-123",
  "timestamp": 1234567890,
  "userAgent": "Mozilla/5.0...",
  "extraData": {}
}
```

**Réponse (succès):**
```json
{
  "success": true,
  "data": { "eventId": 1 },
  "requestId": "1234567890-abc123"
}
```

**Réponse (ignoré):**
```json
{
  "success": true,
  "ignored": true,
  "ignoreReason": "BOT_DETECTED: Bot détecté: ...",
  "requestId": "1234567890-abc123"
}
```

### GET /events

Liste des événements avec filtres et pagination.

**Query parameters:**
- `websiteId` (optionnel): Filtrer par site
- `startDate` (optionnel): Date de début (ISO string ou timestamp)
- `endDate` (optionnel): Date de fin (ISO string ou timestamp)
- `type` (optionnel): Type d'événement (pageview, custom, identify, payment, external_link)
- `path` (optionnel): Filtrer par path
- `visitorId` (optionnel): Filtrer par visiteur
- `sessionId` (optionnel): Filtrer par session
- `page` (optionnel, défaut: 1): Numéro de page
- `limit` (optionnel, défaut: 50): Nombre d'éléments par page

**Exemple:**
```
GET /events?websiteId=site-123&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=50
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "events": [...],
    "total": 1000,
    "page": 1,
    "limit": 50,
    "totalPages": 20
  }
}
```

### GET /stats

Statistiques agrégées pour un site et une plage de dates.

**Query parameters:**
- `websiteId` (requis): ID du site
- `startDate` (requis): Date de début (ISO string ou timestamp)
- `endDate` (requis): Date de fin (ISO string ou timestamp)

**Exemple:**
```
GET /stats?websiteId=site-123&startDate=2024-01-01&endDate=2024-01-31
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "websiteId": "site-123",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z",
    "pageviews": 1000,
    "uniqueVisitors": 500,
    "uniqueSessions": 600,
    "topPages": [
      { "path": "/page1", "count": 100 },
      { "path": "/page2", "count": 80 }
    ],
    "topReferrers": [
      { "referrer": "https://google.com", "count": 200 }
    ],
    "topCustomEvents": [
      { "eventName": "button_click", "count": 50 }
    ],
    "conversions": {
      "count": 10,
      "payments": [...]
    }
  }
}
```

### GET /health

Health check endpoint.

**Réponse:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Types d'événements

### pageview
Événement standard de vue de page. Requiert: `websiteId`, `domain`, `href`, `visitorId`, `sessionId`.

### custom
Événement personnalisé. Requiert en plus: `eventName` dans `extraData`. Limité à 10 paramètres custom supplémentaires.

**Exemple:**
```json
{
  "type": "custom",
  "websiteId": "site-123",
  "domain": "example.com",
  "href": "https://example.com/page",
  "visitorId": "visitor-123",
  "sessionId": "session-123",
  "extraData": {
    "eventName": "button_click",
    "button": "subscribe",
    "plan": "premium"
  }
}
```

### identify
Associe un utilisateur applicatif à un visiteur. Requiert: `user_id` dans `extraData`.

**Exemple:**
```json
{
  "type": "identify",
  "websiteId": "site-123",
  "domain": "example.com",
  "href": "https://example.com/page",
  "visitorId": "visitor-123",
  "sessionId": "session-123",
  "extraData": {
    "user_id": "user-456",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### payment
Enregistre un paiement/conversion. Requiert: `email` OU `payment_id` dans `extraData`.

**Exemple:**
```json
{
  "type": "payment",
  "websiteId": "site-123",
  "domain": "example.com",
  "href": "https://example.com/checkout",
  "visitorId": "visitor-123",
  "sessionId": "session-123",
  "extraData": {
    "email": "customer@example.com",
    "payment_id": "pay_123456",
    "amount": 99.99,
    "currency": "USD"
  }
}
```

### external_link
Enregistre un clic vers un lien externe. Requiert: `linkUrl` dans `extraData`.

**Exemple:**
```json
{
  "type": "external_link",
  "websiteId": "site-123",
  "domain": "example.com",
  "href": "https://example.com/page",
  "visitorId": "visitor-123",
  "sessionId": "session-123",
  "extraData": {
    "linkUrl": "https://external.com",
    "linkText": "Visit External Site"
  }
}
```

## Règles d'ignore

Le backend ignore automatiquement les événements dans les cas suivants :

1. **Tracking désactivé**: Si `datafast_ignore: true` est présent dans la requête
2. **Bots détectés**: User agents correspondant à des patterns de bots/headless browsers
3. **Environnements non autorisés**: localhost, file://, iframes (selon la configuration)
4. **Domaines non autorisés**: Domain non enregistré pour le websiteId
5. **Pageviews throttlés**: Pageview trop récent pour le même visiteur et la même URL (fenêtre de 1 minute par défaut)
6. **Paiements dupliqués**: Paiement déjà enregistré pour la même session

Les événements ignorés sont quand même enregistrés dans la base de données avec `stored: false` et la raison de l'ignore.

## Gestion des sites

Pour autoriser un domaine pour un websiteId, vous pouvez utiliser le service `DomainAuthService` directement dans le code, ou ajouter manuellement dans la table `sites` de la base de données SQLite.

Exemple en code :
```typescript
domainAuthService.registerSite('site-123', 'example.com', ['www.example.com', 'blog.example.com']);
```

## Tests fonctionnels

Un script d'exemple est fourni dans `examples/test-api.sh` pour tester rapidement l'API :

```bash
# Démarrer le serveur d'abord
npm run dev

# Dans un autre terminal, exécuter le script de test
./examples/test-api.sh
```

Vous pouvez également tester manuellement avec curl ou un client HTTP :

```bash
# Health check
curl http://localhost:3000/health

# Envoyer un pageview
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test-site",
    "domain": "example.com",
    "type": "pageview",
    "href": "https://example.com/page",
    "visitorId": "visitor-123",
    "sessionId": "session-123"
  }'

# Lister les événements
curl "http://localhost:3000/events?websiteId=test-site"

# Obtenir les statistiques
curl "http://localhost:3000/stats?websiteId=test-site&startDate=2024-01-01&endDate=2024-12-31"
```

## Script Client

Le script client permet de tracker les événements depuis un site web. Il lit la configuration depuis les paramètres d'URL du script.

### Installation du client

```bash
cd client
npm install
npm run build
```

Les fichiers générés se trouvent dans `client/dist/` :
- `steroid-analytics.js` : Version lisible
- `steroid-analytics.min.js` : Version minifiée (production)

### Snippet à coller

Générez le snippet avec les paramètres de votre site :

```html
<script>
(function(w,d,s){s=d.createElement('script');s.src='https://votre-cdn.com/steroid-analytics.js?w=VOTRE_WEBSITE_ID&d=votre-domaine.com&u=https://votre-backend.com';s.async=1;d.head.appendChild(s)})(window,document);
</script>
```

**Paramètres URL :**
- `w` : websiteId (requis)
- `d` : domain (requis)  
- `u` : backendUrl (requis) - URL de votre backend API

### Utilisation côté client

Une fois le snippet chargé, le script expose une API globale `window.steroid` :

```javascript
// Pageview est tracké automatiquement

// Événement custom
steroid.track('button_click', {
  button: 'subscribe',
  plan: 'premium'
});

// Identifier un utilisateur
steroid.identify('user-123', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Tracker un paiement
steroid.trackPayment({
  email: 'customer@example.com',
  payment_id: 'pay_123456',
  amount: 99.99,
  currency: 'USD'
});

// Tracker un lien externe
steroid.trackExternalLink('https://external.com', 'Click here');
```

Voir `client/README.md` pour plus de détails sur le script client.

## Structure du projet

```
.
├── src/                   # Backend
│   ├── config.ts          # Configuration
│   ├── index.ts           # Point d'entrée
│   ├── types/             # Types TypeScript
│   ├── database/          # Base de données
│   ├── services/          # Services métier
│   ├── routes/            # Routes API
│   └── utils/             # Utilitaires
├── client/                # Script client
│   ├── src/               # Source TypeScript
│   ├── dist/              # Fichiers compilés
│   └── snippet.html       # Exemple de snippet
└── examples/              # Exemples et tests
```

## Base de données

Le backend utilise SQLite par défaut (fichier `analytics.db`). Le schéma inclut :

- `sites` : Sites enregistrés avec leurs domaines autorisés
- `events` : Tous les événements (stored et ignored)
- `pageview_throttle` : Cache pour le throttling des pageviews
- `payment_deduplication` : Cache pour la déduplication des paiements

Les index sont créés automatiquement pour optimiser les requêtes.

## Notes

- Le backend enregistre TOUS les événements, même ceux qui sont ignorés, avec un indicateur `stored: false`
- Les événements ignorés retournent toujours un code HTTP 200 avec `ignored: true`
- Le throttling des pageviews utilise une fenêtre glissante de 1 minute par défaut
- La déduplication des paiements se base sur le `sessionId` et l'identifiant du paiement

