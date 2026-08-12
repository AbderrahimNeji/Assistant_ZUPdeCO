# Scénario Complet de Test Backend - EdNov

## 🎯 Objectif

Ce document décrit un **scénario complet de test backend** pour l'application EdNov.
Il permet de tester les APIs dans un ordre logique, en respectant les dépendances métier entre les modules.

L'objectif est de valider :

- le bon démarrage du backend
- l'authentification Firebase
- la création des données de référence
- la gestion des utilisateurs
- le cycle de vie des sessions
- les modules transverses comme branding, settings, post-its, calendrier, gamification et activity feed

---

## 🧱 Pré-requis

Avant de lancer les tests :

- le backend `ednov-backend` doit être démarré
- la base PostgreSQL/Supabase doit être accessible
- les variables d'environnement Firebase Admin doivent être valides
- les migrations doivent être appliquées
- un token Firebase ID valide doit être disponible pour les routes protégées

Base URL :

```text
http://localhost:3000/api/v1
```

Authentification standard :

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

## 🔐 Règle d'authentification

La majorité des endpoints backend sont protégés par le guard Firebase JWT.

Conséquence :

- il n'y a pas de login mot de passe côté backend
- le frontend ou un outil externe doit d'abord obtenir un token Firebase
- ensuite ce token est transmis au backend

Endpoint clé :

- `GET /users/login` : valide le token et retourne l'utilisateur applicatif courant

---

## 🧭 Ordre recommandé de test

Pour éviter les erreurs de dépendances, exécuter les tests dans cet ordre :

1. `health`
2. `users/login`
3. `companies`
4. `establishments` et `rooms`
5. `roles`, `profiles`, `rules`
6. `academic/*`
7. `activity-types` et `activities`
8. `users`
9. `settings` et `branding`
10. `user-preferences` et `interface-elements`
11. `sessions/config`
12. `sessions`
13. `assignments` et `participants`
14. `reports` et `vsc-reports`
15. `binome-coeur`
16. `post-its`
17. `calendar/events`
18. `dashboards`, `analytics`, `export`
19. `resources`
20. `gamification`
21. `activity-feed`
22. `cleanup`

---

## 1. Health Check

### API

- `GET /health`

### Pourquoi tester cette API

Cette route permet de vérifier que le backend est disponible et que ses dépendances principales sont joignables.

### Ce qu'il faut valider

- code HTTP `200`
- réponse cohérente sur l'état du service
- base de données accessible
- intégration Firebase initialisée correctement

### Remarque

Dans la documentation fonctionnelle, `health` est généralement considérée comme publique. Si elle est protégée dans l'environnement courant, exécuter le test avec un token.

---

## 2. Authentification Applicative

### API

- `GET /users/login`

### Pourquoi tester cette API

Cette route vérifie que le token Firebase reçu par le backend est valide et que l'utilisateur correspondant existe côté application.

### Ce qu'il faut valider

- le token est accepté
- l'utilisateur courant est correctement retourné
- les rôles, le profil et la company sont cohérents

### Cas à couvrir

- token valide
- token invalide
- token valide mais utilisateur non présent côté base

---

## 3. Company

### APIs

- `POST /companies`
- `GET /companies`
- `GET /companies/:id`
- `PATCH /companies/:id`
- `DELETE /companies/:id`

### Pourquoi tester ces APIs

La `company` est la racine métier de l'application. La plupart des modules backend sont rattachés à cette entité.

### Ce qu'il faut valider

- création d'une company de test
- lecture de la liste
- lecture du détail
- mise à jour
- suppression logique

### Donnée de test conseillée

```json
{
  "name": "EDNOV TEST",
  "code": "EDNOVTEST"
}
```

---

## 4. Establishments et Rooms

### APIs

- `GET /companies/:id/establishments`
- `POST /companies/:id/establishments`
- `GET /companies/:id/establishments/:establishmentId`
- `PATCH /companies/:id/establishments/:establishmentId`
- `DELETE /companies/:id/establishments/:establishmentId`
- `GET /companies/:id/rooms`
- `POST /companies/:id/rooms`
- `GET /companies/:id/rooms/:roomId`
- `PATCH /companies/:id/rooms/:roomId`
- `DELETE /companies/:id/rooms/:roomId`

### Pourquoi tester ces APIs

Ces entités permettent de représenter les lieux réels utilisés dans les sessions.

### Ce qu'il faut valider

- création d'au moins un établissement
- création d'au moins une salle
- rattachement correct à la company
- modification et suppression logique fonctionnelles

---

## 5. Roles, Profiles et Rules

### APIs Roles

- `POST /roles`
- `GET /roles`
- `GET /roles/:id`
- `PATCH /roles/:id`
- `DELETE /roles/:id`

### APIs Profiles

- `POST /profiles`
- `GET /profiles`
- `GET /profiles/:id`
- `PATCH /profiles/:id`
- `DELETE /profiles/:id`

### APIs Rules

- `POST /rules`
- `GET /rules`
- `GET /rules/:id`
- `PATCH /rules/:id`
- `DELETE /rules/:id`
- `GET /rules/:id/overrides`
- `POST /rules/:id/overrides`
- `GET /rules/:id/overrides/:overrideId`
- `PATCH /rules/:id/overrides/:overrideId`
- `DELETE /rules/:id/overrides/:overrideId`

### Pourquoi tester ces APIs

- `roles` définissent les permissions
- `profiles` structurent les types d'utilisateurs
- `rules` et `overrides` portent les règles métier configurables

### Ce qu'il faut valider

- création des rôles de base
- récupération de la liste des rôles
- association correcte future avec les utilisateurs
- création de règles métier
- surcharge via `overrides`

### Jeu minimal conseillé

- `ADMIN`
- `COORDINATOR`
- `TUTOR`
- `STUDENT`
- `VSC` si utilisé

---

## 6. Référentiel Académique

### APIs

- `POST /academic/programs`
- `GET /academic/programs`
- `GET /academic/programs/:id`
- `PATCH /academic/programs/:id`
- `DELETE /academic/programs/:id`

- `POST /academic/levels`
- `GET /academic/levels`
- `GET /academic/levels/:id`
- `PATCH /academic/levels/:id`
- `DELETE /academic/levels/:id`

- `POST /academic/subjects`
- `GET /academic/subjects`
- `GET /academic/subjects/:id`
- `PATCH /academic/subjects/:id`
- `DELETE /academic/subjects/:id`

- `POST /academic/school-years`
- `GET /academic/school-years`
- `GET /academic/school-years/:id`
- `PATCH /academic/school-years/:id`
- `DELETE /academic/school-years/:id`

- `POST /academic/holidays`
- `GET /academic/holidays`
- `GET /academic/holidays/:id`
- `PATCH /academic/holidays/:id`
- `DELETE /academic/holidays/:id`

### Pourquoi tester ces APIs

Le module académique fournit les données de référence utilisées par les sessions, les ressources et le calendrier.

### Ordre conseillé

1. `programs`
2. `levels`
3. `subjects`
4. `school-years`
5. `holidays`

### Ce qu'il faut valider

- création correcte de chaque référentiel
- lecture unitaire et liste
- modification des libellés
- suppression logique
- présence des congés dans le calendrier plus tard

---

## 7. Activity Types et Activities

### APIs

- `POST /activity-types`
- `GET /activity-types`
- `GET /activity-types/:id`
- `PATCH /activity-types/:id`
- `DELETE /activity-types/:id`

- `POST /activities`
- `GET /activities`
- `GET /activities/:id`
- `PATCH /activities/:id`
- `DELETE /activities/:id`

### Pourquoi tester ces APIs

Elles permettent de catégoriser et d'instancier les activités utilisées par les sessions.

### Ce qu'il faut valider

- création d'un type d'activité
- création d'une activité rattachée
- lecture et modification
- suppression logique

---

## 8. Users

### APIs

- `POST /users`
- `POST /users/bulk`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/me`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Pourquoi tester ces APIs

Les utilisateurs sont nécessaires pour les sessions, les affectations, les rapports, les post-its, la gamification et les dashboards.

### Jeu minimal conseillé

- 1 admin
- 1 coordinateur
- 2 tuteurs
- 2 étudiants
- 1 volontaire ou VSC si utilisé

### Ce qu'il faut valider

- création unitaire
- création en lot
- mise à jour du profil courant
- mise à jour d'un utilisateur ciblé
- suppression logique
- cohérence des rôles et profils affectés

---

## 9. Settings et Branding

### APIs Settings

- `GET /settings`
- `PUT /settings`
- `GET /settings/feature-flags`
- `PUT /settings/feature-flags`

### APIs Branding

- `GET /branding`
- `GET /branding/complete`
- `PUT /branding`
- `POST /branding/logo`
- `POST /branding/themes`
- `GET /branding/themes`
- `GET /branding/themes/:id`
- `PATCH /branding/themes/:id`
- `DELETE /branding/themes/:id`
- `POST /branding/media-assets`
- `GET /branding/media-assets`
- `GET /branding/media-assets/:id`
- `PATCH /branding/media-assets/:id`
- `DELETE /branding/media-assets/:id`
- `POST /branding/email-templates`
- `GET /branding/email-templates`
- `GET /branding/email-templates/:id`
- `PATCH /branding/email-templates/:id`
- `DELETE /branding/email-templates/:id`
- `POST /branding/document-templates`
- `GET /branding/document-templates`
- `GET /branding/document-templates/:id`
- `PATCH /branding/document-templates/:id`
- `DELETE /branding/document-templates/:id`
- `GET /public/branding/:companyCode`

### Pourquoi tester ces APIs

- `settings` gèrent la configuration globale du tenant
- `feature-flags` permettent d'activer ou désactiver certains comportements
- `branding` couvre la personnalisation visuelle et l'exposition publique de la marque

### Ce qu'il faut valider

- persistance des settings
- activation des feature flags
- récupération du branding complet
- upload du logo si Firebase Storage est configuré
- récupération publique via `companyCode`

---

## 10. User Preferences et Interface Elements

### APIs

- `GET /user-preferences`
- `PUT /user-preferences`
- `PATCH /user-preferences/interface/:interfaceName`
- `GET /interface-elements/:interfaceName`

### Pourquoi tester ces APIs

Elles permettent de vérifier la personnalisation utilisateur et la logique des éléments d'interface selon rôles et préférences.

### Ce qu'il faut valider

- lecture des préférences courantes
- mise à jour des préférences globales
- mise à jour ciblée d'une interface
- restitution correcte des éléments visibles/autorisés

---

## 11. Session Config

### APIs

- `GET /sessions/config`
- `PUT /sessions/config`

### Pourquoi tester ces APIs

Cette configuration pilote le comportement global des sessions pour la company courante.

### Ce qu'il faut valider

- création ou mise à jour de la configuration
- relecture immédiate avec les mêmes valeurs

---

## 12. Sessions

### APIs

- `POST /sessions`
- `GET /sessions`
- `GET /sessions/:id`
- `PATCH /sessions/:id`
- `DELETE /sessions/:id`

### Pourquoi tester ces APIs

Les sessions sont le coeur fonctionnel de l'application. Elles réutilisent plusieurs entités créées dans les étapes précédentes.

### Dépendances principales

- `company`
- `establishment`
- `school-year`
- éventuellement `room`
- éventuellement `program`
- éventuellement `level`
- éventuellement `subject`
- éventuellement `activity`

### Ce qu'il faut valider

- création d'une session complète
- lecture du détail
- récupération en liste
- modification de date, statut, salle ou informations métier
- suppression logique

---

## 13. Assignments et Participants

### APIs Assignments

- `GET /sessions/:id/assignment-candidates`
- `PUT /sessions/:id/assignments`
- `POST /sessions/:id/assignments/auto`

### APIs Participants

- `GET /sessions/:id/participants`
- `POST /sessions/:id/participants`
- `GET /sessions/:id/participants/:participantId`
- `PATCH /sessions/:id/participants/:participantId`
- `DELETE /sessions/:id/participants/:participantId`

### Pourquoi tester ces APIs

Ces APIs couvrent la logique d'affectation tuteur-etudiant et la gestion détaillée des participants d'une session.

### Scénario conseillé

1. lister les candidats possibles
2. créer une affectation manuelle
3. tester l'affectation automatique
4. ajouter un participant
5. modifier un participant
6. supprimer un participant

### Ce qu'il faut valider

- les candidats remontent correctement
- les binômes sont bien enregistrés
- les participants sont visibles dans la session

---

## 14. Session Reports et VSC Reports

### APIs Reports

- `GET /sessions/:id/reports`
- `POST /sessions/:id/reports`
- `GET /sessions/:id/reports/:reportId`
- `PATCH /sessions/:id/reports/:reportId`
- `DELETE /sessions/:id/reports/:reportId`

### APIs VSC Reports

- `GET /sessions/:id/vsc-reports`
- `POST /sessions/:id/vsc-reports`
- `GET /sessions/:id/vsc-reports/:reportId`
- `PATCH /sessions/:id/vsc-reports/:reportId`
- `DELETE /sessions/:id/vsc-reports/:reportId`

### Pourquoi tester ces APIs

Elles valident la traçabilité et le reporting réalisés après ou pendant les sessions.

### Ce qu'il faut valider

- création du rapport
- lecture du rapport
- mise à jour du contenu
- suppression logique ou fonctionnelle selon implémentation

---

## 15. Binome Coeur

### APIs

- `POST /companies/:companyId/binome-coeur`
- `GET /companies/:companyId/binome-coeur`
- `DELETE /companies/:companyId/binome-coeur/:id`

### Pourquoi tester ces APIs

Ce module permet de gérer les binômes préférentiels entre profils, utile pour la logique métier d'affectation.

### Ce qu'il faut valider

- création d'un binôme coeur manuel
- récupération dans la liste
- suppression correcte

---

## 16. Post-Its

### APIs

- `POST /post-its`
- `GET /post-its`
- `GET /post-its/:id`
- `PATCH /post-its/:id`
- `DELETE /post-its/:id`
- `PATCH /post-its/:id/archive`
- `PATCH /post-its/:id/priority`
- `PATCH /post-its/:id/status`
- `POST /post-its/:id/share`
- `POST /post-its/:id/share/role`
- `DELETE /post-its/:id/share/:userId`
- `GET /post-its/:id/shares`

### Pourquoi tester ces APIs

Le module post-it couvre un besoin transverse de notes, priorisation, archivage et partage.

### Scénario conseillé

1. créer un post-it
2. le modifier
3. changer son statut
4. le rendre prioritaire
5. l'archiver
6. le partager à un utilisateur
7. le partager à un rôle
8. lire les partages
9. révoquer un partage

### Ce qu'il faut valider

- l'état du post-it change correctement
- les partages sont persistés
- la liste reflète bien l'état courant

---

## 17. Calendar

### API

- `GET /calendar/events`

### Pourquoi tester cette API

Le calendrier agrège plusieurs sources métier :

- sessions
- post-its
- holidays

### Ce qu'il faut valider

- présence des sessions créées
- présence des congés académiques
- présence des post-its selon les règles métier

---

## 18. Dashboards, Analytics et Export

### APIs Sessions

- `GET /sessions/report-kpis`
- `GET /sessions/dashboard/coordinator`
- `GET /sessions/dashboard/tutor`
- `GET /sessions/attendance-history`
- `GET /sessions/analytics/students`
- `GET /sessions/analytics/tutors`
- `GET /sessions/export`

### API Companies

- `GET /companies/dashboard/manager`

### Pourquoi tester ces APIs

Ces routes valident les vues consolidées et les indicateurs métier issus des sessions et de leur exploitation.

### Ce qu'il faut valider

- les indicateurs remontent les données créées
- les dashboards reflètent les sessions du jeu de test
- l'export génère un contenu exploitable

---

## 19. Resources

### APIs

- `GET /resources`
- `GET /resources/:id`

### Pourquoi tester ces APIs

Elles permettent de vérifier la lecture des ressources pédagogiques côté backend, souvent filtrées par matière et niveau.

### Ce qu'il faut valider

- récupération de la liste
- récupération du détail
- filtrage correct si des ressources sont présentes

---

## 20. Gamification

### APIs Utilisateur

- `GET /gamification/me`
- `GET /gamification/me/history`
- `GET /gamification/leaderboard`

### APIs Admin

- `GET /admin/gamification/niveaux`
- `POST /admin/gamification/niveaux`
- `PATCH /admin/gamification/niveaux/:id`
- `DELETE /admin/gamification/niveaux/:id`
- `GET /admin/gamification/badges`
- `POST /admin/gamification/badges`
- `PATCH /admin/gamification/badges/:id`
- `DELETE /admin/gamification/badges/:id`
- `GET /admin/gamification/xp-rules`
- `POST /admin/gamification/xp-rules`
- `PATCH /admin/gamification/xp-rules/:id`
- `DELETE /admin/gamification/xp-rules/:id`
- `POST /admin/gamification/toggle`

### Pourquoi tester ces APIs

La gamification permet de vérifier les règles de progression, l'attribution des badges et le classement des utilisateurs.

### Ce qu'il faut valider

- lecture du résumé utilisateur
- lecture de l'historique XP
- affichage du leaderboard
- CRUD admin sur niveaux, badges et règles XP
- activation ou désactivation du module

---

## 21. Activity Feed

### API

- `GET /activity-feed/me`

### Pourquoi tester cette API

Le fil d'activité restitue les événements métier visibles pour l'utilisateur connecté, par exemple les sessions réalisées, les rapports soumis ou les badges obtenus.

### Ce qu'il faut valider

- les événements remontés sont cohérents avec les données créées
- le feed est bien filtré sur l'utilisateur courant

---

## 22. Nettoyage

### Pourquoi cette étape est importante

Un bon scénario de test doit pouvoir être rejoué. Il faut donc nettoyer les données dans l'ordre inverse de création.

### Ordre conseillé

1. supprimer les `vsc-reports`
2. supprimer les `reports`
3. supprimer les `participants`
4. supprimer les `sessions`
5. supprimer les `binome-coeur`
6. supprimer les `post-its`
7. supprimer les `activities`
8. supprimer les données `academic`
9. supprimer les `rooms`
10. supprimer les `establishments`
11. supprimer les `users`
12. supprimer la `company`

### Ce qu'il faut valider

- les suppressions sont cohérentes
- le système reste stable après cleanup
- une nouvelle campagne de test peut être relancée sans conflit

---

## ✅ Checklist de validation commune

Pour chaque endpoint testé, vérifier systématiquement :

- le code HTTP retourné
- la structure de la réponse JSON
- la validation des champs
- les permissions selon le rôle
- l'isolation par `company`
- le comportement si l'ID n'existe pas
- le comportement si le payload est invalide
- la persistence réelle en base

---

## ⚠️ Cas transverses à ne pas oublier

### Authentification

- appel sans token
- appel avec token invalide
- appel avec un utilisateur sans droits suffisants

### Validation

- UUID invalide
- champ obligatoire manquant
- type incorrect dans le body

### Multi-tenancy

- une company ne doit pas voir les données d'une autre
- un utilisateur ne doit pas accéder à une ressource d'une autre company

### Soft delete

- une ressource supprimée ne doit plus apparaître dans les listes standards

---

## 🧪 Campagne de test minimale recommandée

Si tu veux une version courte mais efficace, exécute au minimum :

1. `GET /health`
2. `GET /users/login`
3. création d'une `company`
4. création d'un `establishment`
5. création des référentiels `academic`
6. création d'un `activity-type` puis d'une `activity`
7. création des `users`
8. configuration `settings` et `branding`
9. création d'une `session`
10. affectation et ajout de `participants`
11. création d'un `report`
12. création d'un `post-it`
13. lecture `calendar/events`
14. lecture des `dashboards`
15. lecture `gamification/me`
16. lecture `activity-feed/me`

---

## 📌 Conclusion

Ce scénario permet de tester le backend EdNov de manière cohérente, progressive et rejouable.

Il est particulièrement utile pour :

- les tests manuels via Swagger ou Postman
- la préparation de jeux de données de démo
- la validation de non-régression backend
- la structuration future de tests E2E automatisés
