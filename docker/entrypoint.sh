#!/bin/sh

# Script d'entrée pour le conteneur Docker

echo "🚀 Démarrage de Jellyfin Kometa..."

# Crée les répertoires s'ils n'existent pas
mkdir -p /app/config /app/logs /app/data

# Vérifie si le fichier de configuration existe
if [ ! -f "/app/config/jellyfin_config.yaml" ]; then
    echo "📝 Création du fichier de configuration par défaut..."
    cat > /app/config/jellyfin_config.yaml << EOF
jellyfin:
  url: "http://jellyfin:8096"
  api_key: ""

libraries:
  Films:
    collections:
      "Films Marvel":
        filters:
          genre: "Action"
          studio: "Marvel Studios"
      "Classiques des années 80":
        filters:
          year_range: [1980, 1989]
          imdb_rating: 7.0

  "Séries TV":
    collections:
      "Séries Netflix":
        filters:
          network: "Netflix"

settings:
  update_interval: 3600
  create_missing_collections: true
  update_posters: true
  dry_run: false
EOF
    echo "✅ Configuration par défaut créée dans /app/config/jellyfin_config.yaml"
fi

# Démarre l'application
echo "🌐 Démarrage de l'interface web sur le port 3000..."
exec "$@"
