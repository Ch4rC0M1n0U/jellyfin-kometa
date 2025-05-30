# 🐳 Guide Docker pour Jellyfin Kometa

Ce guide vous explique comment déployer Jellyfin Kometa avec Docker et Docker Compose.

## 🚀 Démarrage rapide

### 1. Prérequis

- Docker 20.10+
- Docker Compose 2.0+
- 2GB de RAM minimum
- 1GB d'espace disque

### 2. Installation

\`\`\`bash
# Cloner le repository
git clone <your-repo-url>
cd jellyfin-kometa

# Copier la configuration d'exemple
cp .env.example .env

# Éditer la configuration
nano .env

# Démarrer l'application
make run
\`\`\`

### 3. Accès

- **Interface Kometa**: http://localhost:3000
- **Jellyfin**: http://localhost:8096
- **Logs**: `make logs`

## 📋 Services inclus

### jellyfin-kometa
- **Port**: 3000
- **Description**: Interface web principale
- **Volumes**: config, logs, data

### redis
- **Port**: 6379 (interne)
- **Description**: Cache et sessions
- **Volume**: redis-data

### jellyfin (optionnel)
- **Ports**: 8096, 8920
- **Description**: Serveur média Jellyfin
- **Volumes**: config, cache, media

### kometa-scheduler
- **Description**: Planificateur automatique
- **Configuration**: Variable CRON_SCHEDULE

### nginx (optionnel)
- **Ports**: 80, 443
- **Description**: Reverse proxy
- **Profile**: nginx

## ⚙️ Configuration

### Variables d'environnement

\`\`\`bash
# Jellyfin
JELLYFIN_URL=http://jellyfin:8096
JELLYFIN_API_KEY=your_api_key_here

# Médias
MEDIA_PATH=/path/to/your/media

# Planificateur
CRON_SCHEDULE=0 */6 * * *  # Toutes les 6 heures
\`\`\`

### Volumes

\`\`\`yaml
volumes:
  - ./config:/app/config      # Configuration
  - ./logs:/app/logs          # Logs
  - ./data:/app/data          # Données
  - ./media:/media:ro         # Médias (lecture seule)
\`\`\`

## 🔧 Commandes utiles

\`\`\`bash
# Démarrage
make run                    # Production
make dev                    # Développement

# Gestion
make stop                   # Arrêter
make restart               # Redémarrer
make logs                  # Voir les logs

# Maintenance
make backup                # Sauvegarder
make clean                 # Nettoyer
make update                # Mettre à jour

# Debug
make shell                 # Shell dans le conteneur
make health                # Vérifier l'état
make monitor               # Surveiller les ressources
\`\`\`

## 🏗️ Architectures supportées

- **amd64** (x86_64)
- **arm64** (ARM 64-bit)
- **armv7** (ARM 32-bit)

## 📊 Monitoring

### Health checks

Tous les services incluent des health checks:

\`\`\`bash
# Vérifier l'état
docker-compose ps

# Tests manuels
curl http://localhost:3000/api/health
curl http://localhost:8096/health
\`\`\`

### Logs

\`\`\`bash
# Tous les logs
make logs

# Service spécifique
make logs-app
make logs-scheduler

# Logs en temps réel
docker-compose logs -f jellyfin-kometa
\`\`\`

## 🔒 Sécurité

### Recommandations

1. **Changez les secrets par défaut**
2. **Utilisez HTTPS en production**
3. **Limitez l'accès réseau**
4. **Sauvegardez régulièrement**

### Configuration SSL

\`\`\`bash
# Générer des certificats auto-signés
mkdir -p docker/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/ssl/nginx.key \
  -out docker/ssl/nginx.crt
\`\`\`

## 🚨 Dépannage

### Problèmes courants

**Port déjà utilisé**
\`\`\`bash
# Changer le port dans docker-compose.yml
ports:
  - "3001:3000"  # Au lieu de 3000:3000
\`\`\`

**Permissions de fichiers**
\`\`\`bash
# Corriger les permissions
sudo chown -R $USER:$USER config logs data
\`\`\`

**Mémoire insuffisante**
\`\`\`bash
# Augmenter la limite Docker
docker-compose up -d --memory=2g
\`\`\`

### Logs de debug

\`\`\`bash
# Mode debug
docker-compose logs -f --tail=100 jellyfin-kometa

# Logs détaillés
docker-compose up --verbose
\`\`\`

## 📈 Performance

### Optimisations

1. **Utilisez un SSD** pour les volumes
2. **Allouez suffisamment de RAM**
3. **Activez l'accélération matérielle** pour Jellyfin
4. **Configurez Redis** pour la persistance

### Monitoring des ressources

\`\`\`bash
# Utilisation des ressources
make monitor

# Statistiques détaillées
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
\`\`\`

## 🔄 Mise à jour

\`\`\`bash
# Mise à jour automatique
make update

# Mise à jour manuelle
git pull
docker-compose build --no-cache
docker-compose up -d
\`\`\`

## 💾 Sauvegarde et restauration

\`\`\`bash
# Sauvegarde
make backup

# Restauration
make restore BACKUP=jellyfin-kometa-backup-20240115-143000.tar.gz
\`\`\`

## 🌐 Déploiement en production

### Avec reverse proxy

\`\`\`bash
# Activer nginx
docker-compose --profile nginx up -d
\`\`\`

### Variables d'environnement de production

\`\`\`bash
NODE_ENV=production
JELLYFIN_PUBLISHED_URL=https://your-domain.com
NEXTAUTH_URL=https://kometa.your-domain.com
