# Matching (élève–tuteur) — documentation backend Ednov

Documentation technique de tout ce qui concerne le **matching / affectation** élève–tuteur dans le backend.  
Pour une version orientée parcours métier, voir aussi [AFFECTATION_BINOME_COEUR.md](./AFFECTATION_BINOME_COEUR.md).

---

## 1. Vue d’ensemble

Le « matching » côté backend regroupe :

1. **Binômes cœur** (`core_pairs`) : binômes élève–tuteur stables par périmètre (entreprise, établissement, matière).
2. **Affectations par séance** (`session_student_tutor_pairs`) : binômes pour **une séance donnée**, avec une **origine** (manuelle ou automatique).
3. **Candidats à l’affectation** : filtrage des utilisateurs éligibles (établissement, matière, disponibilité, rôles).
4. **Champ `matched_at`** sur **participants** : métadonnée optionnelle ; **pas** remplie automatiquement par les algos d’affectation.

> **À ne pas confondre** : l’entité **`Assignment`** (`assignments`) lie un **bénévole** à une séance ; ce n’est **pas** le matching élève–tuteur.

---

## 2. Modèles de données

### 2.1 `BinomeCoeur` — table `core_pairs`

| Champ | Rôle |
|--------|------|
| `companyId` | Entreprise (multi-tenant) |
| `establishmentId` | Établissement (nullable) |
| `subjectId` | Matière (nullable) |
| `studentUserId` / `tutorUserId` | La binôme |
| `source` | TypeORM : `'manual'` \| `'auto'` — via l’API POST binôme cœur : **toujours** `'manual'` |

**Contrainte** : unicité sur `(companyId, establishmentId, subjectId, studentUserId, tutorUserId)` (avec gestion `NULL` côté requêtes TypeORM).

**Rôle produit** : préférences « binôme cœur » utilisées en priorité par l’auto-affectation (voir §4.3).

### 2.2 `SessionStudentTutorPair` — table `session_student_tutor_pairs`

| Champ | Rôle |
|--------|------|
| `sessionId` | Séance |
| `studentUserId` / `tutorUserId` | Affectation pour cette séance |
| `assignmentSource` | Origine de la binôme |

**Valeurs de `assignmentSource` (code TypeORM)** :

| Valeur | Signification |
|--------|----------------|
| `manual` | Défini via `PUT /sessions/:id/assignments` |
| `auto_binome_coeur` | Tuteur issu de la table binôme cœur **ou** règle **≥ 5 séances communes** |
| `auto_balanced` | Répartition pour équilibrer la charge entre tuteurs |
| `auto_history` | **Présente dans le type** mais **jamais assignée** par le code actuel de `runAutoAssignment` |

**Contrainte** : unicité sur `(sessionId, studentUserId)` — **un élève** → **au plus un tuteur** par séance.

### 2.3 `SessionParticipant` — `matched_at`

- Colonne `matchedAt` (timestamptz, nullable).
- Renseignée via les DTO **create / update participant**, **pas** par `setAssignments` ni `runAutoAssignment`.

### 2.4 `UserProfile` (impact matching)

- `subjects` (JSONB) : critères « matière de la séance » (`profileHasSubject`).
- `availability` (JSONB) : créneaux hebdo **UTC** ; croisement avec date + heures de la séance (`isAvailableForSession`).

### 2.5 `Activity` — capacité par tuteur

- `maxStudentsPerTutor` : plafond d’élèves **par tuteur** pour une séance (utilisé dans l’auto ; défaut côté service si absent : **10**).

---

## 3. Utilitaires et dépendances

### 3.1 `profileHasSubject` — `src/modules/users/subjects.utils.ts`

- Si la séance n’a **pas** de `subjectId` → l’utilisateur est considéré comme compatible matière.
- Sinon : au moins un `userProfiles[].subjects` doit contenir le `subjectId` (chaîne ou objet avec `id`).

### 3.2 `isAvailableForSession` — `src/modules/users/availability.utils.ts`

- Format attendu : `{ "weekly": [ { "day": 0-6, "start": "HH:mm", "end": "HH:mm" } ] }` en **UTC** (`day` = `Date.getUTCDay()`, 0 = dimanche).
- La plage **entière** de la séance doit être **incluse** dans un créneau (`sessionStart >= slotStart` et `sessionEnd <= slotEnd`).
- Si `startTime` ou `endTime` de la séance est vide → le filtre disponibilité est contourné (considéré disponible).

### 3.3 `findUsersByEstablishmentAndRoleCodes` — `users.service.ts`

- Jointure `user_establishments` + rôles.
- **Élèves** : `STUDENT`.
- **Tuteurs pour l’affectation** : `TEACHER` **et** `VOLUNTEER`.
- Charge `userProfiles` pour le filtrage matière / disponibilité.

### 3.4 `countCommonSessions` — `binome-coeur.service.ts`

Compte les séances où :

- l’élève et le tuteur sont **tous deux** participants ;
- rôles respectifs **`student`** et **`tutor`** ;
- même `establishment_id` ;
- `sessions.deleted_at IS NULL` ;
- si `subjectId` non null : même `subject_id`.

Utilisé pour la règle **≥ 5 séances** (traité comme `auto_binome_coeur`).

---

## 4. Logique métier — `SessionsService`

Fichier principal : `src/modules/sessions/sessions.service.ts`.

### 4.1 `getAssignmentCandidates(sessionId, companyId, …)`

1. Charge la séance (relation `activity`).
2. Exige `establishmentId`.
3. Récupère élèves et tuteurs (`TEACHER` + `VOLUNTEER`) de l’établissement.
4. Filtre : **matière** + **disponibilité** sur `sessionDate`, `startTime`, `endTime`.
5. Retourne `{ students, tutors }`.

### 4.2 `setAssignments(sessionId, companyId, pairs, …)`

1. **`DELETE` de toutes les lignes** `session_student_tutor_pairs` pour ce `sessionId`.
2. Recrée une ligne par binôme avec `assignmentSource: 'manual'`.
3. `syncSessionParticipantsFromPairs` : pour chaque user présent dans les binômes, crée un `SessionParticipant` **s’il n’existe pas** (rôle `student` ou `tutor` déduit). Ne met pas à jour `matchedAt`.
4. **Audit** : `entity: 'session_assignments'`, `action: 'UPDATE'`, `newValue: { pairs: N }`.

**Point critique** : l’affectation manuelle **remplace tout**, y compris les binômes précédemment auto-générées.

### 4.3 `runAutoAssignment(sessionId, companyId, …)`

**Paramètres dérivés** :

- `maxPerTutor = session.activity?.maxStudentsPerTutor ?? 10`
- `manualStudentIds` : élèves ayant **déjà** une binôme avec `assignmentSource === 'manual'` dans `existingPairs`
- `unassignedStudents` : candidats élèves **sans** entrée dans `manualStudentIds` (les élèves avec **seulement** des binômes auto sont **toujours** traités comme « non verrouillés manuellement »)

Pour chaque élève de `unassignedStudents`, dans l’ordre :

1. **Binôme cœur explicite** — recherche `BinomeCoeur` : même `companyId`, `establishmentId`, `subjectId` (ou `NULL` si séance sans matière), `studentUserId`. Parcours des lignes ; premier tuteur **candidat** avec charge &lt; `maxPerTutor` → `auto_binome_coeur`.

2. **Binôme cœur implicite (historique)** — pour chaque tuteur candidat sous la limite, `countCommonSessions(...) >= 5` → `auto_binome_coeur` (ordre d’itération des tuteurs : premier qui satisfait).

3. **Équilibrage** — parmi les tuteurs candidats sous `maxPerTutor`, choix de celui avec la **charge minimale** (binômes existantes + nouvelles) → `auto_balanced`.

Ensuite : **insertion** des **nouvelles** binômes uniquement (`save` sur les entités créées) ; **pas** de suppression des binômes auto précédentes avant la boucle. Puis `syncSessionParticipantsFromPairs` avec `[...existingPairs, ...saved]`. **Audit** : `newValue: { autoAssignments: saved.length }`.

### 4.4 `syncSessionParticipantsFromPairs(sessionId, pairs)`

- Agrège tous les `studentUserId` et `tutorUserId` des binômes fournies.
- Pour chaque user absent de `session_participants`, crée une ligne avec le bon rôle (`student` si l’id apparaît comme élève dans une binôme, sinon `tutor`).

---

## 5. API HTTP

### 5.1 Séances — `SessionsController`

| Méthode | Route | Description |
|---------|--------|----------------|
| `GET` | `/sessions/:id/assignment-candidates` | Candidats élèves / tuteurs (établissement, matière, dispo) |
| `PUT` | `/sessions/:id/assignments` | Body : `{ pairs: [{ studentUserId, tutorUserId }] }` — **remplace toutes** les binômes + source `manual` |
| `POST` | `/sessions/:id/assignments/auto` | Lance `runAutoAssignment` |

DTO : `SetAssignmentsDto` (`dto/set-assignments.dto.ts`).

> La description OpenAPI peut mentionner une étape « history » / `auto_history` : **le flux actuel n’assigne pas `auto_history`**.

### 5.2 Binômes cœur — `BinomeCoeurController`

Préfixe : **`/companies/:companyId/binome-coeur`**

| Méthode | Route | Description |
|---------|--------|----------------|
| `POST` | `/` | Création — body `CreateBinomeCoeurDto` (`establishmentId?`, `subjectId?`, `studentUserId`, `tutorUserId`). Erreur **409** si doublon. |
| `GET` | `/` | Liste ; query `establishmentId?`, `subjectId?` |
| `DELETE` | `/:id` | Suppression si la ligne appartient à `companyId` |

Contrôle : `req.user.company_id` doit égaler `:companyId`.

---

## 6. Points d’attention (implémentation)

1. **`auto_history`** : valeur autorisée en base / TypeScript mais **non produite** par `runAutoAssignment`.
2. **Commentaire** dans le service (« binôme cœur → history → balanced ») vs code réel (pas de branche `auto_history`).
3. **Ré-exécution** de `POST .../assignments/auto` : seuls les élèves avec binôme **manuelle** sont exclus de la boucle. Un élève déjà affecté **uniquement** en auto peut être retraité ; en cas de nouvelle insertion pour le même `(sessionId, studentUserId)`, la contrainte d’unicité peut provoquer une erreur — **comportement à valider** en tests / prod.
4. **`setAssignments`** efface **toutes** les binômes de la séance avant de recréer les binômes manuelles.

---

## 7. Fichiers sources utiles

| Fichier | Rôle |
|---------|------|
| `src/modules/sessions/sessions.service.ts` | Candidats, assignation manuelle, auto, sync participants |
| `src/modules/sessions/sessions.controller.ts` | Routes REST affectation |
| `src/modules/sessions/binome-coeur.service.ts` | CRUD binôme + `countCommonSessions` |
| `src/modules/sessions/binome-coeur.controller.ts` | Routes REST binôme cœur |
| `src/modules/sessions/entities/session-student-tutor-pair.entity.ts` | binômes + `AssignmentSource` |
| `src/modules/sessions/entities/binome-coeur.entity.ts` | `core_pairs` |
| `src/modules/sessions/entities/session-participant.entity.ts` | `matchedAt` |
| `src/modules/sessions/dto/set-assignments.dto.ts` | Validation binômes manuelles |
| `src/modules/sessions/dto/create-binome-coeur.dto.ts` | Création binôme |
| `src/modules/users/availability.utils.ts` | Disponibilité |
| `src/modules/users/subjects.utils.ts` | Matière profil vs séance |
| `src/modules/users/users.service.ts` | `findUsersByEstablishmentAndRoleCodes` |
| `src/modules/activity/entities/activity.entity.ts` | `maxStudentsPerTutor` |

---

## 8. Audit

- **Manuel** : `entity: 'session_assignments'`, `newValue: { pairs: number }`.
- **Auto** : même entité, `newValue: { autoAssignments: number }`.

---

*Dernière mise à jour : mars 2026 — alignée sur le code du dépôt au moment de la rédaction.*
