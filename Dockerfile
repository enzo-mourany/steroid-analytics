FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances
RUN npm ci --only=production

# Installer les dépendances de dev pour le build
RUN npm ci

# Copier le code source
COPY . .

# Builder le TypeScript
RUN npm run build

# Nettoyer les node_modules et réinstaller seulement production
RUN rm -rf node_modules && npm ci --only=production

# Créer un volume pour la base de données (persistant)
VOLUME ["/app/data"]

# Exposer le port (sera overridé par la plateforme de déploiement)
EXPOSE 3000

# Variable d'environnement pour le port
ENV PORT=3000
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "dist/index.js"]

