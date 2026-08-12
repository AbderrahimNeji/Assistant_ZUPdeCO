# Stratégie de Dénormalisation des Noms Foreign Key

## Vue d'ensemble

Cette documentation décrit la stratégie de dénormalisation implémentée pour améliorer les performances et simplifier l'affichage des données dans l'application Ednov.

## Objectif

Stocker les noms d'affichage des entités foreign key directement dans les tables, évitant ainsi:
- Les jointures supplémentaires lors des requêtes de liste
- Les appels API multiples côté frontend
- La complexité du mapping des relations

## Entités Modifiées

### 1. SessionReport (`session_reports`)

**Champs ajoutés:**
- `author_name` (VARCHAR 255) - Nom de l'auteur du rapport
- `session_display_name` (VARCHAR 255) - Format: "Séance du DD/MM/YYYY à HH:MM"
- `validated_by_name` (VARCHAR 255) - Nom du validateur

**Source des données:**
- `author_name` ← `users.display_name` ou `CONCAT(first_name, ' ', last_name)`
- `validated_by_name` ← `users.display_name` ou `CONCAT(first_name, ' ', last_name)`
- `session_display_name` ← Formaté depuis `sessions.session_date` et `sessions.start_time`

### 2. VscReport (`vsc_reports`)

**Champs ajoutés:**
- `student_name` (VARCHAR 255) - Nom de l'élève
- `volunteer_name` (VARCHAR 255) - Nom du volunteer (VSC)
- `session_display_name` (VARCHAR 255) - Format: "Séance du DD/MM/YYYY à HH:MM"

**Source des données:**
- `student_name` ← `users.display_name` ou `CONCAT(first_name, ' ', last_name)`
- `volunteer_name` ← `users.display_name` ou `CONCAT(first_name, ' ', last_name)`
- `session_display_name` ← Formaté depuis `sessions.session_date` et `sessions.start_time`

### 3. Session (`sessions`)

**Champs ajoutés:**
- `room_name` (VARCHAR 255) - Nom de la salle

**Note:** Les autres champs dénormalisés (`establishment_name`, `subject_name`, `level_name`, `program_name`, `activity_name`) existaient déjà.

### 4. Activity (`activities`)

**Champs ajoutés:**
- `activity_type_name` (VARCHAR 255) - Label du type d'activité

**Source des données:**
- `activity_type_name` ← `activity_types.label`

### 5. Holiday (`holidays`)

**Champs ajoutés:**
- `establishment_name` (VARCHAR 255) - Nom de l'établissement (si type = 'establishment_specific')

**Source des données:**
- `establishment_name` ← `establishments.name`

### 6. UserProfile (`user_profiles`)

**Champs ajoutés:**
- `profile_label` (VARCHAR 255) - Label du profil

**Source des données:**
- `profile_label` ← `profiles.label`

### 7. UserRole (`user_roles`)

**Champs ajoutés:**
- `role_label` (VARCHAR 255) - Label du rôle

**Source des données:**
- `role_label` ← `roles.label`

## Migration

**Fichier:** `migrations/1730000000027-AddAllDenormalizedNames.ts`

La migration:
1. Ajoute toutes les colonnes dénormalisées
2. Peuple rétroactivement les données existantes
3. Utilise `CONCAT_WS` pour gérer les valeurs NULL
4. Utilise `TO_CHAR` pour formater les dates
5. Utilise `SUBSTRING` pour extraire HH:MM des timestamps

## Fonctions Utilitaires

**Fichier:** `src/common/utils/format.utils.ts`

### `formatSessionDisplayName(sessionDate, startTime)`
Formate une séance au format: "Séance du DD/MM/YYYY à HH:MM"

### `formatReportDisplayName(sessionDate, startTime)`
Formate un rapport au format: "Rapport de la séance du DD/MM/YYYY à HH:MM"

### `formatUserDisplayName(user)`
Formate un nom d'utilisateur:
1. Utilise `displayName` si disponible
2. Sinon concatène `firstName` + `lastName`
3. Sinon retourne "Utilisateur inconnu"

## Maintenance

### Lors de la création d'entités
Les services backend doivent peupler les champs dénormalisés:
1. Charger l'entité foreign key
2. Extraire le nom/label approprié
3. Utiliser les fonctions utilitaires pour formater
4. Sauvegarder avec les champs dénormalisés

### Lors de la mise à jour
Si une foreign key change, mettre à jour le champ dénormalisé correspondant.

### Cohérence des données
- La migration peuple rétroactivement les données existantes
- Les nouveaux enregistrements doivent inclure les champs dénormalisés
- En cas de désynchronisation, relancer la migration ou créer un script de réparation

## Avantages

1. **Performance:** Pas de jointures pour l'affichage de listes
2. **Simplicité:** Pas de mapping complexe côté frontend
3. **Cohérence:** Format standardisé pour les noms d'affichage
4. **Maintenance:** Facile à déboguer et à comprendre

## Inconvénients et Mitigations

1. **Duplication de données:** Acceptable pour les gains de performance
2. **Synchronisation:** Géré par les services lors des updates
3. **Espace disque:** Minimal (VARCHAR 255 par champ)
4. **Migration initiale:** Peut être longue sur de grandes bases, mais exécutée une seule fois

## Exemple d'utilisation

```typescript
// Backend - Création d'un rapport VSC
const student = await this.userRepository.findOne({ where: { id: dto.studentId } });
const volunteer = await this.userRepository.findOne({ where: { id: dto.volunteerId } });
const session = await this.sessionRepository.findOne({ where: { id: sessionId } });

const vscReport = this.vscReportRepository.create({
  ...dto,
  studentName: formatUserDisplayName(student),
  volunteerName: formatUserDisplayName(volunteer),
  sessionDisplayName: formatSessionDisplayName(session.sessionDate, session.startTime),
});

await this.vscReportRepository.save(vscReport);
```

## Formats de Date

- **Sessions:** "Séance du 14/11/2025 à 16:50"
- **Reports:** "Rapport de la séance du 14/11/2025 à 16:50"
- **Format date:** DD/MM/YYYY
- **Format heure:** HH:MM (24h)
