# Steroid Analytics - Script Client

Script client de tracking pour Steroid Analytics. Lit la configuration depuis les paramètres d'URL du script.

## Installation

```bash
npm install
npm run build
```

## Snippet à coller

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

## Utilisation

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

## Désactiver le tracking

Pour désactiver le tracking (côté client) :

```javascript
// Option 1: Variable globale
window.datafast_ignore = true;

// Option 2: LocalStorage
localStorage.setItem('datafast_ignore', 'true');

// Option 3: Cookie
document.cookie = 'datafast_ignore=true; path=/';
```

## Fichiers générés

- `dist/steroid-analytics.js` : Version lisible
- `dist/steroid-analytics.min.js` : Version minifiée (à utiliser en production)

## Développement

Pour servir le script en local pour tester :

```bash
# Depuis le dossier client
python3 -m http.server 8080

# Puis utilisez dans votre snippet :
# s.src='http://localhost:8080/dist/steroid-analytics.js?w=test&d=localhost&u=http://localhost:3000'
```

