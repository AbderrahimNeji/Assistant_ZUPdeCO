.DEFAULT_GOAL := help

# ─── Couleurs ──────────────────────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RESET  := \033[0m

# ─── Aide ──────────────────────────────────────────────────────────────────────
help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-22s$(RESET) %s\n", $$1, $$2}'

# ─── Setup ─────────────────────────────────────────────────────────────────────
setup: ## Premier setup complet (copie .env, Docker, migrations, seeds, Cursor rules)
	@echo "$(YELLOW)▶ Copie .env.example → .env$(RESET)"
	@[ -f .env ] && echo "  .env existe déjà, ignoré." || cp .env.example .env
	@echo "$(YELLOW)▶ Démarrage PostgreSQL local$(RESET)"
	docker compose up -d
	@echo "$(YELLOW)▶ Installation des dépendances$(RESET)"
	npm ci
	@echo "$(YELLOW)▶ Application des migrations$(RESET)"
	npm run migration:run
	@echo "$(YELLOW)▶ Seed des données de développement$(RESET)"
	npm run seed:all
	@$(MAKE) cursor-rules
	@echo "$(GREEN)✅ Setup terminé — lancez 'make dev'$(RESET)"

# ─── Développement ─────────────────────────────────────────────────────────────
dev: ## Lance PostgreSQL + backend en mode watch
	docker compose up -d
	npm run dev

db-start: ## Démarre PostgreSQL uniquement
	docker compose up -d

db-stop: ## Arrête PostgreSQL
	docker compose stop postgres

db-logs: ## Affiche les logs PostgreSQL
	docker compose logs -f postgres

# ─── Migrations ────────────────────────────────────────────────────────────────
migrate: ## Applique toutes les migrations en attente
	npm run migration:run

migrate-show: ## Affiche le statut des migrations
	npm run migration:show

migrate-revert: ## Annule la dernière migration
	npm run migration:revert

# Usage: make migrate-create NAME=AddColumnUserPhone
migrate-create: ## Génère une migration (ex: make migrate-create NAME=AddColumnUserPhone)
	@[ -n "$(NAME)" ] || (echo "❌ Usage: make migrate-create NAME=<NomCamelCase>" && exit 1)
	npm run migration:generate -- migrations/$(NAME)

# ─── Seeds ─────────────────────────────────────────────────────────────────────
seed: ## Lance tous les seeders (données de dev)
	npm run seed:all

seed-roles: ## Seed uniquement les rôles
	npm run seed:roles

# ─── Qualité ───────────────────────────────────────────────────────────────────
lint: ## Lance ESLint
	npm run lint

typecheck: ## Lance TypeScript typecheck (sans build)
	npm run typecheck

test: ## Lance les tests unitaires
	npm test

test-watch: ## Lance les tests en mode watch
	npm run test:watch

ci: lint typecheck test ## Lance toute la chaîne CI localement

# ─── Reset ─────────────────────────────────────────────────────────────────────
reset-db: ## ⚠️  Repart d'une base vide (supprime les données, DÉVELOPPEMENT UNIQUEMENT)
	@echo "$(YELLOW)⚠️  Cela supprime toutes les données locales. Continuer ? [y/N]$(RESET)" \
		&& read ans && [ $${ans:-N} = y ]
	docker compose down -v
	docker compose up -d
	@sleep 3
	npm run migration:run
	npm run seed:all
	@echo "$(GREEN)✅ Base réinitialisée$(RESET)"

# ─── Nettoyage ─────────────────────────────────────────────────────────────────
cursor-rules: ## Installe les Cursor rules depuis .cursor/rules.example/ (non écrasées si déjà présentes)
	@echo "$(YELLOW)▶ Installation des Cursor rules$(RESET)"
	@mkdir -p .cursor/rules
	@for f in .cursor/rules.example/*.mdc; do \
		dest=".cursor/rules/$$(basename $$f)"; \
		if [ -f "$$dest" ]; then \
			echo "  $$(basename $$f) existe déjà — ignoré (supprimez-le pour réinstaller)"; \
		else \
			cp "$$f" "$$dest"; \
			echo "  ✅ $$(basename $$f) installé"; \
		fi; \
	done

cursor-rules-update: ## ⚠️  Écrase les Cursor rules locales avec les dernières versions des exemples
	@echo "$(YELLOW)▶ Mise à jour forcée des Cursor rules$(RESET)"
	@mkdir -p .cursor/rules
	@for f in .cursor/rules.example/*.mdc; do \
		cp "$$f" ".cursor/rules/$$(basename $$f)"; \
		echo "  ✅ $$(basename $$f) mis à jour"; \
	done
	@echo "$(GREEN)✅ Cursor rules mises à jour$(RESET)"

clean: ## Supprime dist/ et node_modules
	rm -rf dist node_modules

.PHONY: help setup dev db-start db-stop db-logs \
        migrate migrate-show migrate-revert migrate-create \
        seed seed-roles \
        lint typecheck test test-watch ci \
        cursor-rules cursor-rules-update \
        reset-db clean
