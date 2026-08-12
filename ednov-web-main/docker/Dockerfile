# =============================================================================
# DOCKERFILE OPTIMISÉ POUR FRONTEND REACT + VITE
# =============================================================================

# Stage 1: Builder - Build de l'application React
FROM node:24-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances (meilleur caching)
COPY package*.json ./

# Installer les dépendances avec cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# Copier le code source
COPY . .

# Arguments de build pour les variables d'environnement Vite
ARG VITE_API_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

# Définir les variables d'environnement pour Vite
ENV VITE_API_URL=$VITE_API_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Build de l'application
RUN npm run build

# Stage 2: Runner - Serveur Nginx optimisé
FROM nginx:1.27-alpine AS runner

# Installer curl pour les health checks
RUN apk add --no-cache curl

WORKDIR /usr/share/nginx/html

# Supprimer le contenu par défaut de nginx
RUN rm -rf ./*

# Copier les fichiers buildés
COPY --from=builder /app/dist .

# Copier la configuration nginx optimisée
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Créer un utilisateur non-root
RUN addgroup --system --gid 101 nginx && \
    adduser --system --disabled-password --no-create-home --uid 101 --ingroup nginx nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Changer vers l'utilisateur non-root
USER nginx

# Exposer le port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Labels
LABEL maintainer="EdNov Team" \
      version="1.0" \
      description="EdNov Web Frontend"

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]
