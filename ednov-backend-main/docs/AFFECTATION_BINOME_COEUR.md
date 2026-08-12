# Affectation élèves–tuteurs et binôme cœur

Documentation de l’implémentation de l’affectation des élèves aux tuteurs par séance (manuelle et automatique) et du mécanisme **binôme cœur**.

**Conventions** : en base de données la table des binômes cœur s’appelle `core_pairs` (anglais) ; l’API et le concept métier restent « binôme cœur » (routes `/binome-coeur`, entité `BinomeCoeur`).

---

## 1. Vue d’ensemble

- **binômes explicites** : une table `session_student_tutor_pairs` stocke, pour chaque séance, quelle binôme (élève, tuteur) est affectée. Un élève n’a qu’**un seul tuteur** par séance (contrainte d’unicité `session_id` + `student_user_id`). Un **tuteur** peut avoir **plusieurs élèves** (limite définie par `activities.max_students_per_tutor`).
- **Binôme cœur** : une binôme (élève, tuteur) peut être marquée comme “binôme cœur” pour un établissement et une matière (table `core_pairs`). En affectation auto, ces binômes sont prioritaires. Une binôme est aussi considérée binôme cœur **automatiquement** si l’élève et le tuteur ont fait **au moins 5 séances ensemble** (même établissement, même matière).
- **Deux modes** :
  - **Manuel** : choix des binômes à partir des listes de candidats (même établissement, matière, créneaux dispo).
  - **Auto** : ne modifie pas les binômes manuelles ; remplit le reste selon les priorités (binôme cœur → répartition équilibrée), en respectant le max d’élèves par tuteur défini sur l’activité.

---

## 2. Modèle de données concerné

| Table / colonne | Rôle |
|------------------|------|
| `session_student_tutor_pairs` | binômes (session, élève, tuteur) avec `assignment_source` : `manual`, `auto_binome_coeur`, `auto_balanced`. Unicité sur `(session_id, student_user_id)`. Un tuteur peut apparaître sur plusieurs lignes (plusieurs élèves). |
| `core_pairs` | Binômes cœur (entité TypeORM : `BinomeCoeur`). binômes privilégiées : `company_id`, `establishment_id`, `subject_id`, `student_user_id`, `tutor_user_id`, `source` (`manual` / `auto`). |
| `user_establishments` | Lien user ↔ établissement : utilisé pour “même établissement” dans les candidats. |
| `activities.max_students_per_tutor` | Nombre max d’élèves par tuteur par séance (config d’activité). Utilisé pour l’affectation auto et le plafond par tuteur. |
| `session_participants` | Liste des participants à la séance (qui est présent, avec quel rôle). Synchronisé à partir des binômes : chaque élève et tuteur présent dans une binôme a une entrée participant (rôle `student` ou `tutor`). |

**Rôle des trois tables** : `session_participants` indique *qui* participe à la séance ; `session_student_tutor_pairs` indique *qui est avec qui* (affectation effective) ; `core_pairs` contient les *préférences* (binômes cœur) utilisées en priorité par l’affectation auto.

Les candidats (élèves / tuteurs) sont filtrés par :
- **Établissement** : via `user_establishments`.
- **Rôle** : élèves = rôle `STUDENT`, tuteurs = rôles `TEACHER` ou `VOLUNTEER`.
- **Matière** : `UserProfile.subjects` contient le `subjectId` de la séance (ou un objet avec `id`).
- **Disponibilité** : `UserProfile.availability` au format créneaux hebdomadaires en **UTC**, ex. `{ "weekly": [ { "day": 1, "start": "09:00", "end": "12:00" } ] }` (jour 0–6). Le créneau de la séance doit être inclus dans au moins un slot.

---

## 3. APIs Binôme cœur

Base : **`/companies/:companyId/binome-coeur`**.  
L’utilisateur doit appartenir à la même `company_id` (vérification côté contrôleur).

### 3.1 Créer un binôme cœur (marquage manuel)

- **Méthode / URL** : `POST /companies/:companyId/binome-coeur`
- **Body** : `CreateBinomeCoeurDto`
  - `establishmentId` (optionnel, UUID)
  - `subjectId` (optionnel, UUID)
  - `studentUserId` (UUID, requis)
  - `tutorUserId` (UUID, requis)
- **Comportement** : insère une ligne dans `core_pairs` avec `source = 'manual'`. Si la même combinaison (company, establishment, subject, student, tutor) existe déjà → `409 Conflict`.
- **Réponse** : entité `BinomeCoeur` créée (201).

### 3.2 Lister les binômes cœur

- **Méthode / URL** : `GET /companies/:companyId/binome-coeur`
- **Query** (optionnel) :
  - `establishmentId` : filtrer par établissement
  - `subjectId` : filtrer par matière
- **Comportement** : retourne les binômes cœur de la société, avec relations `studentUser`, `tutorUser`, `establishment`, `subject`. Si un filtre est omis, la condition équivaut à `IS NULL` en base (binôme “tous établissements” ou “toutes matières”).
- **Réponse** : tableau d’entités `BinomeCoeur`.

### 3.3 Supprimer un binôme cœur

- **Méthode / URL** : `DELETE /companies/:companyId/binome-coeur/:id`
- **Comportement** : supprime la ligne dont l’`id` est fourni, si elle appartient à `companyId`. Sinon → `404 Not Found`.
- **Réponse** : `204 No Content`.

---

## 4. APIs Affectation (séance)

Base : **`/sessions/:sessionId`** (ou `:id` dans le code). Les méthodes ci‑dessous utilisent la séance identifiée par `sessionId` pour établissement, matière, date et horaire.

### 4.1 Candidats pour l’affectation

- **Méthode / URL** : `GET /sessions/:id/assignment-candidates`
- **Comportement** :
  1. Charge la séance (avec activité pour `max_students_per_tutor` si besoin).
  2. Récupère les users de l’établissement de la séance avec rôles `STUDENT` d’une part, `TEACHER` et `VOLUNTEER` d’autre part (`user_establishments` + `user_roles`).
  3. Filtre par **matière** : au moins un profil du user doit contenir le `subjectId` de la séance (`UserProfile.subjects`).
  4. Filtre par **disponibilité** : au moins un profil doit avoir un créneau hebdomadaire (UTC) qui couvre `(sessionDate, startTime, endTime)`.
- **Réponse** : `{ students: User[], tutors: User[] }` (users avec `userProfiles` chargés).

### 4.2 Affectation manuelle

- **Méthode / URL** : `PUT /sessions/:id/assignments`
- **Body** : `SetAssignmentsDto` → `{ pairs: [ { studentUserId, tutorUserId }, ... ] }`
- **Comportement** :
  1. Supprime toutes les binômes existantes pour cette séance.
  2. Crée les nouvelles binômes avec `assignment_source = 'manual'`.
  3. Met à jour `session_participants` : pour chaque user présent dans une binôme (élève ou tuteur), crée une entrée participant si elle n’existe pas encore (rôle `student` ou `tutor`).
  4. Audit log sur `session_assignments`.
- **Réponse** : tableau des `SessionStudentTutorPair` enregistrées.

### 4.3 Affectation automatique

- **Méthode / URL** : `POST /sessions/:id/assignments/auto`
- **Comportement** :
  1. Charge les binômes existantes pour la séance ; les binômes avec `assignment_source = 'manual'` sont **conservées** (élèves déjà assignés manuellement exclus de l’auto).
  2. Récupère candidats (comme en 4.1) : `students` et `tutors`.
  3. Pour chaque élève **non encore assigné** (ni manuel ni déjà traité dans cette exécution), applique les règles dans l’ordre ci‑dessous, en ne dépassant jamais `activity.max_students_per_tutor` (par défaut 10 si non défini).
  4. Synchronise `session_participants` avec toutes les binômes (existantes + nouvelles).
  5. Audit log.
- **Réponse** : tableau de toutes les binômes après opération (manuelles + auto).

---

## 5. Logique détaillée de l’affectation auto

Pour chaque **élève non assigné** (non couvert par une binôme manuelle), l’algorithme applique les étapes suivantes dans l’ordre. Dès qu’une étape attribue un tuteur à l’élève, on passe à l’élève suivant.

### 5.1 Priorité 1 : Binôme cœur (table)

- Requête sur `core_pairs` : `companyId`, `establishmentId` de la séance, `subjectId` de la séance (ou `IS NULL` si pas de matière), `studentUserId` = l’élève.
- Pour chaque binôme cœur trouvé dont le `tutor_user_id` est dans la liste des **tuteurs candidats** et dont le nombre actuel d’élèves assignés est **< max_students_per_tutor** :
  - Crée une binôme (élève, ce tuteur) avec `assignment_source = 'auto_binome_coeur'`.
  - Passe à l’élève suivant.

### 5.2 Priorité 2 : Binôme cœur “auto” (≥ 5 séances communes)

- Pour chaque tuteur candidat qui n’a pas encore atteint `max_students_per_tutor` :
  - Appel à **`BinomeCoeurService.countCommonSessions(studentUserId, tutorUserId, establishmentId, subjectId)`** :
    - Compte les séances (non supprimées) où l’élève a participé en `student`, le tuteur en `tutor`, même `establishment_id`, et même `subject_id` (ou les deux à NULL).
  - Si ce nombre **≥ 5** : crée une binôme (élève, ce tuteur) avec `assignment_source = 'auto_binome_coeur'`, puis passe à l’élève suivant.

### 5.3 Priorité 3 : Répartition équilibrée

- Parmi les tuteurs candidats, choisit celui qui a **le moins d’élèves** déjà assignés (binômes existantes + binômes créées dans cette exécution), sans dépasser `max_students_per_tutor`.
- Crée une binôme (élève, ce tuteur) avec `assignment_source = 'auto_balanced'`.

Si aucun tuteur n’est disponible (tous à capacité max), l’élève reste non assigné pour cette séance.

---

## 6. Récapitulatif des APIs

| Méthode | URL | Rôle |
|--------|-----|------|
| `POST` | `/companies/:companyId/binome-coeur` | Créer un binôme cœur (manuel) |
| `GET` | `/companies/:companyId/binome-coeur` | Lister les binômes cœur (filtres optionnels) |
| `DELETE` | `/companies/:companyId/binome-coeur/:id` | Supprimer un binôme cœur |
| `GET` | `/sessions/:id/assignment-candidates` | Obtenir élèves et tuteurs éligibles |
| `PUT` | `/sessions/:id/assignments` | Remplacer les binômes (affectation manuelle) |
| `POST` | `/sessions/:id/assignments/auto` | Compléter l’affectation automatiquement (sans écraser le manuel) |

---

## 7. Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `src/modules/sessions/sessions.service.ts` | `getAssignmentCandidates`, `setAssignments`, `runAutoAssignment`, `syncSessionParticipantsFromPairs` |
| `src/modules/sessions/binome-coeur.service.ts` | CRUD binôme cœur (table `core_pairs`), `countCommonSessions` |
| `src/modules/sessions/binome-coeur.controller.ts` | Routes `POST/GET/DELETE` sous `companies/:companyId/binome-coeur` |
| `src/modules/sessions/sessions.controller.ts` | Routes `GET assignment-candidates`, `PUT assignments`, `POST assignments/auto` |
| `src/modules/users/availability.utils.ts` | `isAvailableForSession` (créneaux hebdo UTC) |
| `src/modules/users/subjects.utils.ts` | `profileHasSubject` |
| `src/modules/users/users.service.ts` | `findUsersByEstablishmentAndRoleCodes` (via `user_establishments`) |
| Entités | `SessionStudentTutorPair` (table `session_student_tutor_pairs`), `BinomeCoeur` (table `core_pairs`), `UserEstablishment` ; `Activity.maxStudentsPerTutor` |

Cette documentation décrit l’implémentation actuelle des APIs et de la logique liées au binôme cœur et à l’affectation élèves–tuteurs par séance.
