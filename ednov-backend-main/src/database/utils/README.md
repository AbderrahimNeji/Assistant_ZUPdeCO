# Utilitaires de gestion de la base de données

## Sélection dynamique de l'environnement DB

### Vue d'ensemble

Le système permet de choisir dynamiquement quelle base de données utiliser lors de l'exécution de scripts, seeders ou migrations via le paramètre `--env`.

### Configuration

Ajoutez les connexions dans le fichier `.env` :

```bash
# Dev (par défaut)
DATABASE_URL=postgresql://user:pass@host:5432/db_dev

# Recette
DATABASE_URL_RECETTE=postgresql://user:pass@host:5432/db_recette

# Vous pouvez ajouter d'autres environnements:
# DATABASE_URL_PROD=postgresql://...
# DATABASE_URL_STAGING=postgresql://...
```

### Utilisation

#### Scripts

```bash
# Utilise DATABASE_URL (dev par défaut)
npm run script:add-filter-recurrence

# Utilise DATABASE_URL_RECETTE
npm run script:add-filter-recurrence -- --env=recette
```

#### Seeders

```bash
# Dev (par défaut)
npm run seed:companies
npm run seed:all

# Recette
npm run seed:companies -- --env=recette
npm run seed:all -- --env=recette
```

#### Migrations TypeORM

```bash
# Dev (par défaut)
npm run migration:run

# Recette
npm run migration:run -- --env=recette
```

### Ajouter un nouvel environnement

1. Ajoutez la variable dans `.env` :
   ```bash
   DATABASE_URL_PROD=postgresql://...
   ```

2. Utilisez-la :
   ```bash
   npm run seed:all -- --env=prod
   ```

### Fonctionnement technique

- `get-database-url.ts` : Parse les arguments CLI pour détecter `--env=<nom>`
- Si `--env=recette`, cherche `DATABASE_URL_RECETTE` dans `process.env`
- Si `--env` n'est pas fourni ou `--env=dev`, utilise `DATABASE_URL`
- Affiche l'URL de connexion (avec mot de passe masqué) pour confirmation

### Fichiers concernés

- `src/database/utils/get-database-url.ts` - Logique de sélection
- `src/database/seeders/seeder-datasource.ts` - DataSource pour les seeders
- `data-source.ts` - DataSource pour les migrations et scripts utilisant `dataSource`

### Sécurité

- Le mot de passe est automatiquement masqué dans les logs console
- Ne committez jamais le fichier `.env` (déjà dans `.gitignore`)
- Utilisez `.env.example` comme template
