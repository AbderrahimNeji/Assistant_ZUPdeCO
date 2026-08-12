# Génération automatique des rapports VSC

## Vue d'ensemble

Système de génération automatique de rapports pour les Coordinateurs de Bénévoles (VSC), avec fréquence configurable par utilisateur.

## Configuration

### Base de données

Chaque VSC peut configurer ses préférences de génération dans `user_profiles.vsc_reports_frequencies` (JSONB):

```json
{
  "daily": true,    // Rapports journaliers
  "weekly": false   // Rapports hebdomadaires
}
```

### Horaires (timezone: Europe/Paris)

- **Journalier**: Tous les jours à 20h00
- **Hebdomadaire**: Dimanche à 20h00

> **Note**: Pour les tests, les horaires sont temporairement configurés à 17h34 dans `vsc-report-scheduler.service.ts`

## Architecture

### Services

1. **`UsersVscConfigService`**
   - Gestion de la configuration `vscReportsFrequencies`
   - Récupération des VSCs par fréquence de rapport

2. **`VscReportGenerationService`**
   - Calcul des métriques (sessions, affectations, comptes rendus, heures)
   - Création des rapports dans la base de données

3. **`VscReportSchedulerService`**
   - Orchestration des cron jobs
   - Gestion du cycle de génération pour toutes les companies

## Workflow de génération

```
1. Cron job déclenché (20h00 ou dimanche 20h00)
   ↓
2. Récupération de toutes les companies actives
   ↓
3. Pour chaque company:
   - Récupération des VSCs avec la fréquence activée
   ↓
4. Pour chaque VSC:
   - Récupération de TOUS les établissements actifs de la company
   ↓
5. Pour chaque établissement:
   - Calcul des 8 métriques sur la période
   - Création du rapport (avec gestion d'idempotence)
```

## Métriques calculées

| Métrique              | Description                           |
|-----------------------|---------------------------------------|
| `sessions_completed`  | Séances terminées                     |
| `sessions_closed`     | Séances clôturées                     |
| `sessions_cancelled`  | Séances annulées                      |
| `assignments_created` | Affectations créées                   |
| `reports_submitted`   | Comptes rendus saisis                 |
| `reports_pending`     | Comptes rendus à saisir               |
| `reports_validated`   | Comptes rendus validés                |
| `tutor_hours`         | Heures tuteurs (calculées)            |

## Idempotence

Les rapports sont uniques par combinaison:
```sql
UNIQUE(vsc_id, establishment_id, category, period_start)
```

Si un rapport existe déjà, il est retourné sans erreur.

## Endpoints API

### Configuration VSC

```http
# Mettre à jour la configuration
PATCH /api/v1/users/:id/vsc-reports-frequencies
{
  "daily": true,
  "weekly": false
}

# Récupérer la configuration
GET /api/v1/users/:id/vsc-reports-frequencies
```

### Rapports

```http
# Liste des rapports (avec filtres)
GET /api/v1/sessions/vsc-reports?category=daily&page=1&pageSize=20

# Détail d'un rapport
GET /api/v1/sessions/vsc-reports/:id

# Modifier un rapport
PATCH /api/v1/sessions/vsc-reports/:id

# Supprimer un rapport
DELETE /api/v1/sessions/vsc-reports/:id
```

## Sécurité (RBAC)

Un VSC peut uniquement:
- Voir ses propres rapports (`report.vsc_id === currentUser.id`)
- Modifier ses propres rapports
- Supprimer ses propres rapports

Un volunteer peut voir les rapports où `report.volunteer_id === currentUser.id`

## Logs et debugging

Les services utilisent le `Logger` NestJS avec différents niveaux:
- `logger.debug()`: Détails d'exécution (queries, étapes)
- `logger.log()`: Événements importants (rapports créés, VSCs trouvés)
- `logger.warn()`: Avertissements (aucun établissement trouvé)
- `logger.error()`: Erreurs avec stack traces complets

## Commandes utiles

```bash
# Lancer la migration
npm run migration:run

# Ajouter le filtre catégorie
npm run seed:vsc-reports-category

# Voir les logs en temps réel
# (les logs apparaissent automatiquement dans le terminal du serveur)
```

## Structure des données

### Table `vsc_reports`

Champs principaux:
- `vsc_id` (UUID): Coordinateur responsable
- `establishment_id` (UUID): Établissement concerné
- `category` (enum): `daily` | `weekly`
- `period_start` / `period_end` (timestamptz): Période du rapport
- `session_id`, `student_id`, `volunteer_id` (UUID, nullable): Pour compatibilité avec anciens rapports manuels
- 8 champs de métriques (int/decimal)
- `status` (enum): `draft` | `submitted` | `validated`

### Table `user_profiles`

Nouveau champ:
- `vsc_reports_frequencies` (JSONB): Configuration de génération

## Dépannage

### Aucun rapport généré

1. Vérifier que le VSC a `vscReportsFrequencies` configuré
2. Vérifier que le VSC a le role `volunteer` (code = 'volunteer')
3. Vérifier que le VSC est `status = 'active'`
4. Vérifier les logs du cron job dans le terminal

### Erreur "session_id violates not-null"

Migration `1730000000032-MakeVscReportSessionIdNullable` doit être exécutée.

### Erreur "Cannot read properties of undefined (reading 'databaseName')"

Problème avec les relations TypeORM. Vérifier que l'entity `VscReport` n'a pas de relations `@ManyToOne` vers des entités supprimées.
