/**
 * Utilitaire pour sélectionner la bonne connexion DB selon le paramètre CLI --env
 * 
 * Usage:
 *   npm run script:add-filter-recurrence              → utilise DATABASE_URL (dev par défaut)
 *   npm run script:add-filter-recurrence -- --env=recette  → utilise DATABASE_URL_RECETTE
 *   npm run seed:companies -- --env=recette            → utilise DATABASE_URL_RECETTE
 * 
 * Pour ajouter d'autres environnements, ajoutez DATABASE_URL_<NOM> dans le .env
 * et utilisez --env=<nom>
 */

/**
 * Récupère l'URL de la base de données selon le paramètre --env
 * @returns L'URL de connexion à utiliser
 */
export function getDatabaseUrl(): string {
  // Chercher le paramètre --env dans les arguments CLI
  const envArg = process.argv.find(arg => arg.startsWith('--env='));
  const targetEnv = envArg ? envArg.split('=')[1] : 'dev';

  let databaseUrl: string | undefined;

  if (targetEnv === 'dev' || !envArg) {
    // Par défaut ou explicitement dev
    databaseUrl = process.env.DATABASE_URL;
    console.log('🔌 Connexion: DATABASE_URL (dev)');
  } else {
    // Chercher DATABASE_URL_<ENV> (ex: DATABASE_URL_RECETTE)
    const envVarName = `DATABASE_URL_${targetEnv.toUpperCase()}`;
    databaseUrl = process.env[envVarName];
    
    if (!databaseUrl) {
      console.error(`❌ Erreur: Variable d'environnement ${envVarName} non trouvée dans le .env`);
      console.error(`   Variables disponibles: DATABASE_URL (dev), DATABASE_URL_RECETTE, DATABASE_URL_REMOTE`);
      process.exit(1);
    }
    
    console.log(`🔌 Connexion: ${envVarName}`);
  }

  if (!databaseUrl) {
    console.error('❌ Erreur: DATABASE_URL non définie dans le .env');
    process.exit(1);
  }

  // Masquer le mot de passe dans les logs
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`   URL: ${maskedUrl}\n`);

  return databaseUrl;
}
