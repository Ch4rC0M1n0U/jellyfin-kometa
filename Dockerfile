# Utilise une image Node.js officielle comme base
FROM node:18-alpine AS base

# Installe les dépendances système nécessaires
RUN apk add --no-cache libc6-compat python3 py3-pip

# Définit le répertoire de travail
WORKDIR /app

# Copie les fichiers de configuration des dépendances
COPY package.json package-lock.json* ./

# Installe les dépendances Node.js
RUN npm ci --only=production

# Stage pour le build de l'application Next.js
FROM base AS builder
WORKDIR /app

# Copie tous les fichiers source
COPY . .

# Installe toutes les dépendances (dev incluses)
RUN npm ci

# Build l'application Next.js
RUN npm run build

# Stage de production
FROM node:18-alpine AS runner
WORKDIR /app

# Crée un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Installe Python et les dépendances pour le script Kometa
RUN apk add --no-cache python3 py3-pip
RUN pip3 install requests pyyaml pillow

# Copie les fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copie le script Python
COPY --from=builder /app/jellyfin_kometa.py ./scripts/
COPY --from=builder /app/docker/entrypoint.sh ./

# Crée les répertoires nécessaires
RUN mkdir -p /app/config /app/logs /app/data
RUN chown -R nextjs:nodejs /app

# Rend le script d'entrée exécutable
RUN chmod +x /app/entrypoint.sh

# Expose le port
EXPOSE 3000

# Définit les variables d'environnement
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Change vers l'utilisateur non-root
USER nextjs

# Commande de démarrage
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
