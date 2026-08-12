# Documentation Backend - EdNov

## 📚 Table des Matières

### 🏗️ Architecture
- [Architecture Générale](./01-architecture.md) - Vue d'ensemble NestJS
- [Structure des Modules](./02-modules.md) - Organisation modulaire

### 🗄️ Base de Données
- [Schéma de Base](./03-database-schema.md) - Tables et relations
- [Migrations](./04-migrations.md) - Gestion des migrations TypeORM
- [Entities](./05-entities.md) - Entities TypeORM

### 🔐 Authentication & Authorization
- [Firebase Auth](./06-firebase-auth.md) - Intégration Firebase
- [JWT Strategy](./07-jwt-strategy.md) - Validation des tokens
- [RBAC](./08-rbac.md) - Role-Based Access Control

### 📐 Modules Principaux

#### Branding
- [Branding Module](./09-branding.md) - Logos et charte graphique dynamique
- [Branding - Couleurs & Logos](./05-branding-colors-logos.md) - 🎨 **Structure complète** - 3 couleurs × 3 nuances + 3 logos (Light & Dark)

#### User Preferences
- [User Preferences Module](./10-user-preferences.md) - Préférences utilisateur

#### Interface Elements
- [Interface Elements Module](./11-interface-elements.md) - Système de layout dynamique

### 🔧 Utilitaires
- [Audit Log](./12-audit-log.md) - Traçabilité des actions
- [Validation](./13-validation.md) - DTOs et validation
- [Error Handling](./14-error-handling.md) - Gestion d'erreurs

### 🐳 Déploiement
- [Docker](./15-docker.md) - Configuration Docker
- [Environment](./16-environment.md) - Variables d'environnement

### 📖 API
- [API Reference](./17-api-reference.md) - Documentation Swagger
- [Endpoints](./18-endpoints.md) - Liste des endpoints
- [Scénario de Test Backend](./19-scenario-tests-backend.md) - Parcours complet de test backend avec ordre des APIs
- [Exemple CSV import élèves](./samples/students-import-example.csv) - Fichier d’exemple pour `POST /users/import-csv`

### 🎯 Sessions & matching (élève–tuteur)
- [Matching (référence technique)](./matching.md) - Entités, APIs, algo, points d’attention
- [Affectation & binôme cœur](./AFFECTATION_BINOME_COEUR.md) - Parcours métier et tables

## 🚀 Démarrage Rapide

```bash
# Installation
npm install

# Développement
npm run start:dev

# Build
npm run build

# Migrations
npm run migration:run

# Seeds
npm run seed:dashboard-elements
```

## 📦 Technologies Utilisées

- **NestJS v11** - Framework backend
- **TypeORM** - ORM
- **PostgreSQL 16** - Base de données
- **Firebase Admin SDK** - Authentication
- **Swagger** - Documentation API
- **class-validator** - Validation
- **class-transformer** - Transformation
- **Joi** - Validation env

## 🎯 Fonctionnalités Principales

### ✅ Multi-Tenancy
- Isolation par `company_id`
- Données séparées par entreprise

### ✅ Soft Delete
- Suppression logique avec `deleted_at`
- Récupération possible

### ✅ Audit Trail
- Traçabilité complète
- Logs automatiques (CREATE, UPDATE, DELETE)

### ✅ Event Sourcing
- Pattern Outbox
- Événements asynchrones

### ✅ White-Labeling
- Branding personnalisé par entreprise
- Logos et couleurs dynamiques

### ✅ RBAC
- Permissions granulaires
- Contrôle d'accès par rôle

## 📖 Documentation par Module

### Branding
- Logos (main, dark, monochrome, icon, favicon)
- Couleurs (primary, secondary, accent + nuances)
- Thèmes (light/dark)
- Custom CSS et fonts

### User Preferences
- Dark mode
- Configurations par interface (JSONB)
- Personnalisation utilisateur

### Interface Elements
- Définition des éléments UI
- Permissions par rôle
- Layout dynamique

## 🔗 Liens Utiles

- [Frontend Documentation](../../Ednov-web/docs/README.md)
- [Architecture Globale](../../ARCHITECTURE.md)
- [Swagger UI](http://localhost:3000/api)

## 📞 Support

Pour toute question, consulter la documentation appropriée ou contacter l'équipe de développement.

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2 Mars 2026
