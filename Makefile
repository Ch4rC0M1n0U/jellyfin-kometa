# Makefile pour Jellyfin Kometa

.PHONY: help build run dev stop logs clean install

# Variables
COMPOSE_FILE = docker-compose.yml
PROJECT_NAME = jellyfin-kometa

help: ## Affiche cette aide
	@echo "Commandes disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances
	npm install
	cp .env.example .env

build: ## Build les images Docker
	docker compose build

run: ## Lance l'application en production
	docker compose up -d

dev: ## Lance l'application en mode développement
	docker compose -f $(COMPOSE_FILE) -f docker-compose.override.yml up

stop: ## Arrête l'application
	docker compose down

restart: ## Redémarre l'application
	docker compose restart

logs: ## Affiche les logs
	docker compose logs -f

logs-app: ## Affiche les logs de l'application principale
	docker compose logs -f jellyfin-kometa

logs-scheduler: ## Affiche les logs du planificateur
	docker compose logs -f kometa-scheduler

shell: ## Ouvre un shell dans le conteneur principal
	docker compose exec jellyfin-kometa sh

shell-scheduler: ## Ouvre un shell dans le conteneur planificateur
	docker compose exec kometa-scheduler sh

clean: ## Nettoie les conteneurs et volumes
	docker compose down -v
	docker system prune -f

clean-all: ## Nettoie tout (images, conteneurs, volumes)
	docker compose down -v --rmi all
	docker system prune -af

backup: ## Sauvegarde la configuration et les données
	mkdir -p backups
	tar -czf backups/jellyfin-kometa-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz config data logs

restore: ## Restaure depuis une sauvegarde (usage: make restore BACKUP=filename)
	@if [ -z "$(BACKUP)" ]; then echo "Usage: make restore BACKUP=filename"; exit 1; fi
	tar -xzf backups/$(BACKUP)

update: ## Met à jour l'application
	git pull
	docker compose build
	docker compose up -d

health: ## Vérifie l'état des services
	docker compose ps
	@echo "\n=== Tests de santé ==="
	@curl -f http://localhost:3000/api/health || echo "❌ Interface web non accessible"
	@curl -f http://localhost:8096/health || echo "❌ Jellyfin non accessible"

monitor: ## Surveille les ressources
	docker stats $(shell docker compose ps -q)

# Commandes de développement
test: ## Lance les tests
	npm test

lint: ## Vérifie le code
	npm run lint

format: ## Formate le code
	npm run format

# Commandes de déploiement
deploy-prod: ## Déploie en production
	@echo "🚀 Déploiement en production..."
	docker compose -f $(COMPOSE_FILE) up -d --build
	@echo "✅ Déploiement terminé"

deploy-staging: ## Déploie en staging
	@echo "🚀 Déploiement en staging..."
	docker compose -f $(COMPOSE_FILE) -f docker-compose.staging.yml up -d --build
	@echo "✅ Déploiement terminé"
