# EdNov Backend (Monolithe)

Backend NestJS **monolithique** reprenant la même philosophie fonctionnelle qu’Ednov-api (auth Firebase, identity, règles de matching), sans microservices ni Kubernetes.

## Prérequis

- **Node.js** >= 20
- **npm** >= 10
- **PostgreSQL**
- Compte **Firebase** (Auth + Admin SDK)

## Installation

```bash
cd ednov-backend
npm install
```

## Configuration

1. Copier `.env.example` vers `.env`
2. Renseigner `DATABASE_URL`, `FIREBASE_*`, et éventuellement `CORS_ORIGINS`

### Connexion à Supabase (PostgreSQL)

Pour utiliser une base PostgreSQL hébergée sur [Supabase](https://supabase.com) :

1. Créer un projet Supabase, puis **Settings → Database** : récupérer la **Connection string** (URI, mode Session ou Transaction ; port 5432 en direct ou 6543 avec pooler).
2. Dans `.env` : définir `DATABASE_URL` avec cette URI et **`DATABASE_SSL=true`**.
3. À la racine de `ednov-backend` : `npm run migration:run` pour appliquer le schéma (34 tables).
4. Vérifier : `npm run dev` puis appeler `GET /api/v1/health` pour confirmer que la base et Firebase sont opérationnels.

## Base de données (PostgreSQL + TypeORM)

- Une seule base PostgreSQL, un seul schéma (`public` par défaut).
- **Source de vérité** : le schéma de référence est `sql/full-schema.sql`. La migration initiale exécute ce fichier ; **utiliser les migrations** pour tous les environnements (pas de mélange avec application manuelle du SQL).
- **Migrations** (CLI TypeORM, fichier `data-source.ts`) :
  - Appliquer les migrations : `npm run migration:run` (depuis la racine `ednov-backend`)
  - Générer une migration après changement d’entités : `npm run migration:generate -- migrations/NomMigration`
  - Créer une migration vide : `npm run migration:create -- migrations/NomMigration`
  - Annuler la dernière : `npm run migration:revert`
  - Liste des migrations : `npm run migration:show`
- La migration initiale (`migrations/1730000000000-InitialSchema.ts`) applique `sql/full-schema.sql` et crée les **32 tables** white-label (companies, establishments, rooms, users, roles, sessions, audit, outbox, etc.). Voir `sql/README.md`.
- **Production** : ne jamais utiliser `synchronize` (déjà désactivé lorsque `NODE_ENV !== 'development'`). Toujours appliquer le schéma via `migration:run`.
- **Développement** : pour éviter toute divergence, lancer `npm run migration:run` au premier démarrage plutôt que de s’appuyer uniquement sur `synchronize`.

### Données de test (seed)

**Seed minimal (login / identity)** — `npm run seed`  
Peuple la base avec une company `EDNOV-DEV`, un établissement, les rôles (admin, coordinator, volunteer), un utilisateur de test, session config et année scolaire. Idempotent : si une company avec le code `EDNOV-DEV` existe déjà, le script ne fait rien.

1. Appliquer les migrations : `npm run migration:run`
2. Optionnel : dans `.env`, définir `SEED_FIREBASE_UID` avec l’UID Firebase de ton compte (sinon le script utilise un UID par défaut)
3. Lancer le seed : `npm run seed` (depuis la racine `ednov-backend`)

**Seed complet (dashboard + app mobile)** — `npm run seed:dashboard`  
Peuple la base avec une company de test à ID fixe (`EDTECH-01`), un tuteur (ID fixe), le rôle **STUDENT**, des élèves, des séances (passées/à venir), des participants, des comptes rendus (brouillon/soumis), la gamification (niveaux, badges, XP, leaderboard) et des ressources pédagogiques. Utilisé pour tester toutes les fonctionnalités de l’app mobile (Tableau de bord, Séances, Comptes rendus, Élèves, Profil, Ressources, Classement, Historique).

1. Appliquer les migrations : `npm run migration:run`
2. Optionnel : dans `.env`, définir `SEED_FIREBASE_UID` avec l’UID Firebase du compte avec lequel tu te connecteras à l’app (sinon le tuteur de test utilise un UID par défaut)
3. Lancer le seed : `npm run seed:dashboard`

Les seeders sont dans `src/database/seeders/` (bootstrap-demo, branding, sessions, test-data, etc.). Voir aussi `ednov-mobile-v2/docs/test-scenarios.md` pour les scénarios de test de l’app mobile.

**Ajouter une séance « maintenant »** (optionnel) : `npm run seed:session-now` crée une séance en statut « en cours » à la date et l’heure actuelles (à lancer après `seed:dashboard`). Utile pour tester l’affichage d’une séance en cours.

**Synchroniser le tuteur avec ton compte Firebase** : si tu te connectes avec `tutor.test@ednov.fr` mais que les séances n’apparaissent pas (ou 401), le tuteur en base a un autre `firebase_uid`. Dans Firebase Console → Authentication → Users, récupère l’UID de `tutor.test@ednov.fr`, mets-le dans `.env` sous `SYNC_FIREBASE_UID`, puis lance `npm run seed:sync-firebase-uid`. Reconnecte-toi dans l’app.

**Vérifier pourquoi une séance ne s’affiche pas** : `npm run seed:check-session` [sessionId] affiche le tuteur (id, company_id, firebase_uid), la dernière séance « session-now », les participants, et rappelle la procédure de sync si besoin.

## Lancement

```bash
# Développement
npm run dev

# Production
npm run build
npm run start:prod
```

### Préfixe et URLs

- **Préfixe API** : toutes les routes métier sont sous **`/api/v1`** (health, users, companies, etc.).
- **Swagger** : exposé à la racine (sans préfixe), uniquement si `NODE_ENV !== 'production'`.

| Ressource | URL |
|-----------|-----|
| Base API | `http://localhost:3000/api/v1` |
| Health (public) | `GET http://localhost:3000/api/v1/health` |
| Swagger UI | `http://localhost:3000/api-docs` |
| OpenAPI JSON | `http://localhost:3000/api-docs-json` |

Dans le fichier `docs/swagger.json`, les chemins sont relatifs au serveur `servers[0].url = "/api/v1"` (ex. `/health` = `GET /api/v1/health`).

## Authentification (Firebase uniquement)

L’API n’expose **pas** de `POST /auth/login` ni de login par email/mot de passe. L’authentification est gérée côté client par **Firebase Authentication**. Le client obtient un **Firebase ID token** après connexion (email/mot de passe, Google, etc.) et l’envoie sur les routes protégées.

- **Route « login » côté API** : `GET /api/v1/users/login` avec l’en-tête `Authorization: Bearer <Firebase ID token>`. Retourne le profil complet de l’utilisateur (id, email, company, rôles, profils, etc.).
- **Routes publiques** (sans token) : `GET /api/v1/health`, `GET /api/v1/public/branding/:companyCode`.
- **Toutes les autres routes** exigent `Authorization: Bearer <Firebase ID token>`.

**Backend vs frontend :** Le backend utilise **Firebase Admin** (compte de service : `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` dans `.env`). La config frontend (`REACT_APP_FIREBASE_*`) sert à obtenir l’ID token côté client ; elle n’est pas utilisée par l’API. `FIREBASE_PROJECT_ID` doit correspondre au projet Firebase qui émet les tokens (ex. `zupdeco-preprod`).

---

### Processus détaillé du login

1. **Côté client (frontend ou outil de test)**  
   L’utilisateur se connecte via Firebase Authentication (email/mot de passe, Google, etc.). Firebase renvoie un **ID token** (JWT) signé par Firebase. Le client doit envoyer ce token à chaque requête protégée.

2. **Requête vers l’API**  
   Le client envoie une requête (ex. `GET /api/v1/users/login`) avec l’en-tête :  
   `Authorization: Bearer <Firebase ID token>`.

3. **Côté backend (NestJS)**  
   - **FirebaseJwtGuard** : lit l’en-tête `Authorization`, extrait le token. Si la route est publique (`@Public()`), il laisse passer. Sinon, il appelle **Firebase Admin** `verifyIdToken(token)` pour vérifier la signature et l’expiration du token. En cas d’échec → `401 Unauthorized`.  
   - Si le token est valide, Firebase renvoie notamment `uid` (Firebase UID). Le guard appelle **AuthService.getUserByFirebaseUid(uid)** : recherche en base l’utilisateur avec ce `firebase_uid`, vérifie qu’il existe, n’est pas supprimé et a le statut `active`. Sinon → `401 Unauthorized`.  
   - Si l’utilisateur existe : le guard attache à `request.user` les infos `{ uid: id métier, company_id, roles }`, puis la requête continue.

4. **Réponse de `GET /api/v1/users/login`**  
   Le contrôleur appelle **UsersService.findMe(request.user.uid)** qui charge l’utilisateur avec ses relations (company, userRoles, userProfiles) et renvoie le profil complet (entité User sérialisée). C’est la réponse « login » : l’app sait qui est connecté et dans quelle company.

5. **Requêtes suivantes**  
   Pour toute autre route protégée, le client renvoie le même header `Authorization: Bearer <token>`. Le token expire après environ 1 h ; le client doit en récupérer un nouveau (refresh côté Firebase) puis le renvoyer.

**Résumé :** Pas de session côté serveur. Chaque requête envoie le Firebase ID token ; le backend le vérifie et charge l’utilisateur en base pour autoriser et enrichir `request.user`.

---

### Commandes cURL (login complet)

Remplacer `VOTRE_EMAIL`, `VOTRE_MOT_DE_PASSE` et `VOTRE_API_KEY` (clé Web Firebase du projet, ex. dans la console Firebase → Project settings → General → Web API Key).

**Étape 1 — Récupérer le Firebase ID token** (API Firebase Auth REST) :

```bash
curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"VOTRE_EMAIL\",\"password\":\"VOTRE_MOT_DE_PASSE\",\"returnSecureToken\":true}"
```

Dans la réponse JSON, récupérer la valeur du champ **`idToken`** (longue chaîne JWT). En cas d’erreur (email/mot de passe invalide), Firebase renvoie un JSON avec `error.message`.

**Étape 2 — Appeler l’API login du backend** (coller le `idToken` à la place de `ID_TOKEN_ICI`) :

```bash
curl -s -X GET "http://localhost:3000/api/v1/users/login" \
  -H "Authorization: Bearer ID_TOKEN_ICI" \
  -H "Content-Type: application/json"
```

Réponse attendue (200) : JSON du profil utilisateur (id, email, company, userRoles, userProfiles, etc.). En cas de token invalide ou expiré → 401. Si l’utilisateur n’existe pas en base pour ce `firebase_uid` → 401.

**En une seule commande (Bash, avec `jq`)** :

```bash
export API_KEY="VOTRE_API_KEY"
export EMAIL="VOTRE_EMAIL"
export PASSWORD="VOTRE_MOT_DE_PASSE"
TOKEN=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"returnSecureToken\":true}" \
  | jq -r '.idToken')
curl -s -X GET "http://localhost:3000/api/v1/users/login" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Sans `jq`** : exécuter l’étape 1, copier à la main la valeur de `idToken` dans la réponse, puis l’étape 2 en remplaçant `ID_TOKEN_ICI`.

## Documentation OpenAPI (Swagger)

- **Swagger UI** : avec le serveur lancé (`npm run dev`), ouvrir **`http://localhost:3000/api-docs`**. Disponible uniquement hors production (`NODE_ENV !== 'production'`). Pour appeler les routes protégées : bouton **« Authorize »** → schéma **Firebase** → coller le Firebase ID token.
- **OpenAPI JSON** : **`http://localhost:3000/api-docs-json`** sert de source pour l’export.
- **Fichier `docs/swagger.json`** : copie OpenAPI 3.0 de toutes les routes (génération de clients, CI, etc.).
  - **Regénérer** : `npm run dev` dans un terminal, puis `npm run swagger:fetch` dans un autre → écrit `docs/swagger.json` depuis `GET /api-docs-json`.
  - **Alternative** : `npm run swagger:generate` (démarre l’app puis écrit le fichier ; nécessite `.env` et base disponible).

## Routes principales (préfixe `/api/v1`)

| Méthode | Route | Description | Auth |
|--------|------|-------------|------|
| GET | /api/v1/health | Santé (DB, Firebase) | Public |
| GET | /api/v1/public/branding/:companyCode | Branding public (logo, thème) | Public |
| GET | /api/v1/users/login | Profil de l’utilisateur connecté | Bearer (Firebase) |
| GET/POST/PATCH/DELETE | /api/v1/users, /users/:id | CRUD utilisateurs | Bearer |
| GET/POST/PATCH/DELETE | /api/v1/companies, /companies/:id, …/establishments, …/rooms | CRUD companies, établissements, salles | Bearer |
| GET/POST/PATCH/DELETE | /api/v1/roles | CRUD rôles | Bearer |
| GET/POST/PATCH/DELETE | /api/v1/profiles | CRUD profils | Bearer |
| GET/PUT | /api/v1/settings, /api/v1/settings/feature-flags | Paramètres et feature flags | Bearer |
| GET/POST/PATCH/DELETE | /api/v1/academic/programs, /levels, /subjects, /school-years, /holidays | Données académiques | Bearer |
| GET/POST/PATCH/DELETE | /api/v1/rules, /rules/:id/overrides | Règles et overrides | Bearer |
| GET/PUT + CRUD | /api/v1/branding, /themes, /media-assets, /email-templates, /document-templates | Branding et templates | Bearer |
| GET/POST/PATCH/DELETE | /api/v1/sessions, …/participants, …/reports, …/vsc-reports | Séances et rapports | Bearer |

Pour le détail de chaque chemin (paramètres, corps, réponses), consulter la **Swagger UI** (`/api-docs`) ou le fichier **`docs/swagger.json`**.

## Structure (résumé)

- `src/common` : base entity, config TypeORM, validation env, filtre HTTP, logger, swagger, health Firebase, event publisher (no-op)
- `src/auth` : guard Firebase JWT (vérification ID token), décorateur `@Public()`, Firebase Admin (vérification des tokens) ; pas d’endpoint login/register (auth côté client Firebase)
- `src/health` : contrôleur health (DB + Firebase)
- `src/modules/users` : CRUD + `GET /users/login` (profil connecté via token Firebase)
- `src/modules/companies` | `profiles` | `roles` : entités et modules Identity (Company = racine tenant)
- `src/modules/rules` : entités Rule / RuleOverride (matching)
- `src/modules/sessions` | `academic` | `branding` | `settings` : séances, données académiques, marque blanche, paramètres

Aucun proxy, aucun service externe (RabbitMQ/PubSub optionnels via `EventPublisherService` si besoin ultérieur).
