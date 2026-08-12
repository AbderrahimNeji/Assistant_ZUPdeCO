# Schéma SQL – Ednov Backend

## Source de vérité

Le fichier **`full-schema.sql`** décrit le **schéma initial** uniquement. L’état réel de la base après toutes les migrations est : **full-schema + migrations 1 à 9**. Une base neuve doit être créée via `npm run migration:run` (ne pas appliquer `full-schema.sql` seul). Pour appliquer le schéma complet, **une seule méthode** est recommandée :

### Méthode recommandée : migrations TypeORM

**Checklist avant `migration:run` :**

1. **Variables d’environnement** (fichier `.env` à la racine de `ednov-backend`) :
   - `DATABASE_URL` : URL PostgreSQL (ex. Supabase : `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres`)
   - `DATABASE_SSL=true` pour Supabase ou toute connexion TLS
   - Optionnel : `DATABASE_SCHEMA=public`, `DATABASE_LOGGING=true` pour déboguer

2. **Répertoire de travail** : lancer la commande depuis la racine du projet (`ednov-backend`), car la migration initiale charge `sql/full-schema.sql` via `process.cwd()`.

3. **Base vide** : sur une base neuve, toutes les migrations s’exécutent dans l’ordre (voir liste ci-dessous). Si la base a déjà des tables, faire un backup avant ou utiliser une base de test.

Depuis la racine du projet backend (`ednov-backend`) :

```bash
# Appliquer toutes les migrations (y compris le schéma initial = full-schema.sql)
npm run migration:run
```

La migration initiale (`migrations/1730000000000-InitialSchema.ts`) exécute le contenu de `sql/full-schema.sql`. Ainsi, **`migration:run` produit exactement la même base** que le fichier SQL de référence. À utiliser pour tous les environnements (dev, CI, staging, production).

- **Ne pas mélanger** : si vous utilisez les migrations, n’appliquez pas en plus `full-schema.sql` à la main sur la même base.
- Évolutions de schéma : écrire une migration manuelle qui exécute du SQL ciblé (les migrations 1–8 étendent le schéma initial).

### Ordre des migrations et rollback

**Migrations (dans l’ordre)** :
1. `1730000000000-InitialSchema` (exécute full-schema.sql)
2. `1730000000001-AddRules` (rules, rule_overrides)
3. `1730000000002-DropPasswordHash` (supprime users.password_hash)
4. `1730000000003-AddUserInterfacePreferences` (user_interface_preferences)
5. `1730000000004-ExtendBrandingsTable` (colonnes branding)
6. `1730000000005-AddInterfaceElements` (interface_elements, role_interface_elements)
7. `1730000000006-RefactorBrandingWithClearNaming` (refonte colonnes brandings)
8. `1730000000007-AddBrandingHistoriesCreatedAt` (created_at sur branding_histories)
9. `1730000000008-AddTriggersUpdatedAt` (triggers updated_at sur 3 tables)
10. `1730000000009-AddDeletedAtIndexes` (index deleted_at sur tables soft delete)

**Rollback complet** : exécuter le `down` dans l’ordre inverse (9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1), puis le down de l’InitialSchema.

**Convention** : pour les prochaines migrations, utiliser `gen_random_uuid()` (natif PostgreSQL 13+) pour les colonnes UUID par défaut, et ajouter les triggers `set_updated_at()` sur les tables qui ont `updated_at`.

### Méthode alternative : script SQL manuel (nouvelle base vide)

Uniquement pour créer une base **vierge** sans passer par TypeORM (ex. premier déploiement sans Node) :

```bash
# DATABASE_URL doit être défini
psql "$DATABASE_URL" -f sql/full-schema.sql
```

Après cela, ne pas exécuter `migration:run` sur cette base sans avoir géré la table des migrations TypeORM, sinon risque de double exécution. En pratique, privilégier **migration:run** partout.

### Données de test (seed)

Pour insérer des jeux de données minimales (company EDNOV-DEV, établissement, rôles, utilisateur de test lié à Firebase), voir le README principal : section **Données de test (seed)**. Commande : `npm run seed` (après `migration:run`). Variable optionnelle : `SEED_FIREBASE_UID`.

---

## Contenu de `full-schema.sql`

- **État décrit** : `full-schema.sql` correspond au **schéma initial** uniquement. L’état final de la base après `npm run migration:run` est : full-schema + toutes les migrations 1 à 9 (rules, rule_overrides, suppression password_hash, user_interface_preferences, extensions brandings, interface_elements, role_interface_elements, refonte brandings, created_at sur branding_histories, triggers updated_at, index deleted_at).
- **32 tables** dans `full-schema.sql` ; les migrations ajoutent **rules**, **rule_overrides**, **user_interface_preferences**, **interface_elements**, **role_interface_elements** et modifient **brandings**, **branding_histories**. Tables principales : companies, establishments, rooms, users (Firebase), roles, user_roles, profiles, user_profiles, programs, levels, subjects, school_years, holidays, session_configs, sessions, session_participants, assignments, session_reports, vsc_reports, company_settings, feature_flags, brandings, branding_histories, themes, media_assets, email_templates, document_templates, ui_configurations, audit_logs, outbox_events, processed_events, idempotency_keys.
- **Multi-tenant** : le périmètre tenant est la **Company** (table `companies`, colonne `company_id` sur les tables métier). Il n’y a pas de tables `tenants` ni `actors` dans ce schéma.
- **Firebase Auth** : `users.firebase_uid` (unique), champs optionnels (email_verified, photo_url, etc.).
- **Soft delete** : `deleted_at` où applicable ; index uniques avec `WHERE deleted_at IS NULL`.
- **Observabilité** : audit_logs, outbox_events, processed_events, idempotency_keys.
- **Triggers** : mise à jour automatique de `updated_at` sur les tables concernées.
