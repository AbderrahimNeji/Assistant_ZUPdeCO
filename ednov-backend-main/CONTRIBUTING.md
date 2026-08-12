# Guide de contribution — Ednov Backend

## Sommaire

1. [Setup local](#1-setup-local)
2. [Branching strategy](#2-branching-strategy)
3. [Convention des migrations](#3-convention-des-migrations)
4. [Workflow PR](#4-workflow-pr)
5. [CI/CD](#5-cicd)
6. [Règles d'or](#6-règles-dor)

---

## 1. Setup local

Chaque développeur travaille sur sa **propre base PostgreSQL locale** — jamais sur une base partagée.

```bash
make setup   # copie .env, lance Docker, migrations, seeds
make dev     # démarre backend en mode watch
```

Consulter `Makefile` pour toutes les commandes disponibles (`make help`).

**Variables d'environnement** : copier `.env.example` → `.env` et renseigner les clés Firebase personnelles.

---

## 2. Branching strategy & Linear

```
main          ← production uniquement, protégée (PR + review obligatoire)
develop       ← env dev/QA, branche d'intégration
feat/<slug>   ← nouvelle fonctionnalité (depuis develop)
fix/<slug>    ← correction de bug (depuis develop)
hotfix/<slug> ← urgence prod (depuis main, merge → main + develop)
```

### Convention de nommage des branches

**Format obligatoire : `<type>/poc-<numéro>-<description>`**

```
feat/poc-123-add-phone-to-user
fix/poc-456-fix-migration-role-groups
chore/poc-789-update-dependencies
hotfix/poc-101-fix-prod-crash
```

Toujours copier le nom depuis Linear : ticket → **"Copy git branch name"**, puis adapter le préfixe de type (`feat/`, `fix/`, etc.).

### Automatisation Linear

Lorsqu'une PR est **mergée sur `develop`** :
- Le ticket Linear passe automatiquement en **"In Review"**
- Un commentaire est posté sur le ticket avec le lien de la PR et sa description

Lorsqu'une PR est **mergée sur `main`** :
- Le ticket Linear passe automatiquement en **"Done"**

**Règles :**
- Ne jamais committer directement sur `main` ou `develop`
- Toujours ouvrir une PR pour merger
- Chaque PR doit référencer un ticket Linear dans le template (`Closes POC-XXX`)

---

## 3. Convention des migrations

### Principes

| Règle | Raison |
|---|---|
| **1 migration max par PR** | Évite les conflits de timestamp TypeORM |
| **Nom explicite en PascalCase** | Lisible dans `migration:show` |
| **Toujours tester localement** | `run` + `revert` + `run` avant la PR |
| **Jamais `migration:run` manuel sur staging/prod** | Réservé au CI/CD uniquement |

### Créer une migration

```bash
# Via Makefile (recommandé)
make migrate-create NAME=AddPhoneColumnToUser

# Ou directement
npm run migration:generate -- migrations/AddPhoneColumnToUser
```

TypeORM génère : `migrations/1748000000000-AddPhoneColumnToUser.ts`

### Tester une migration localement

```bash
npm run migration:run      # appliquer
npm run migration:revert   # annuler
npm run migration:run      # re-appliquer — doit fonctionner sans erreur
```

### Checklist avant de committer une migration

- [ ] La migration s'applique sans erreur (`migration:run`)
- [ ] La migration se réverse sans erreur (`migration:revert`)
- [ ] La migration se ré-applique après revert (`migration:run`)
- [ ] Le fichier de migration est commité avec le code qui l'utilise (dans le même commit ou la même PR)
- [ ] Pas de `synchronize: true` dans le code (dangereux en prod)

### Conflits de migrations

Si deux branches créent une migration au même timestamp (rare mais possible) :

1. Renommer manuellement le timestamp de la migration la plus récente
2. Mettre à jour la classe TypeORM en conséquence (`export class NomMigration1748000000001`)
3. Ne jamais supprimer une migration déjà appliquée sur staging/prod — créer une nouvelle migration corrective

---

## 4. Workflow PR

```
1. Créer une branche depuis develop
   git checkout develop && git pull
   git checkout -b feat/ma-feature

2. Développer + tester localement
   make ci   # lint + typecheck + tests en local

3. Si migration : tester run/revert/run

4. Ouvrir la PR sur develop
   - Titre : [feat|fix|chore] Description courte
   - Description : Pourquoi ce changement ? Quelle migration ? Seeds à re-lancer ?

5. La CI s'exécute automatiquement (lint, typecheck, tests, migrations)

6. Review par 1+ développeur

7. Squash & merge sur develop → CI déploie sur staging
```

---

## 5. CI/CD

### Workflows

| Fichier | Déclencheur | Actions |
|---|---|---|
| `ci.yml` | Toute PR vers `develop` ou `main` | lint, typecheck, tests, migration integrity |
| `deploy-staging.yml` | Push sur `develop` | `migration:run` staging + deploy |
| `deploy-prod.yml` | Push sur `main` | `migration:run` prod + deploy (approbation manuelle) |

### Secrets GitHub requis

| Secret | Description |
|---|---|
| `DATABASE_URL_STAGING` | URL PostgreSQL de l'environnement staging |
| `DATABASE_URL_PROD` | URL PostgreSQL de l'environnement production |
| + secrets hébergeur | Render, Railway, Fly.io selon votre plateforme |

### Environnements GitHub

- `staging` : déploiement automatique après merge sur `develop`
- `production` : **approbation manuelle requise** avant déploiement

Configurer dans : GitHub → Settings → Environments

---

## 6. Règles d'or

```
✅ Base locale pour développer
✅ Migration testée (run/revert/run) avant PR
✅ 1 migration max par PR
✅ CI passe avant merge
✅ migration:run sur staging/prod = CI/CD uniquement

❌ Jamais committer directement sur develop ou main
❌ Jamais migration:run manuel sur une base partagée
❌ Jamais supprimer une migration déjà appliquée
❌ Jamais synchronize: true en dehors du dev local
```
