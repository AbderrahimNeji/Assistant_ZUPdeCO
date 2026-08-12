/**
 * Exécute uniquement la migration ReclassifyLyceeToProfessionnel1803700000000
 * et l'inscrit dans la table `migrations` pour rester aligné avec `npm run migration:run`.
 *
 * Prérequis :
 *   migrations/data/reclassify-lycee-to-professionnel-ids.json
 *   (généré via : npx ts-node --transpile-only src/scripts/generate-lycee-type-migration-sql.ts)
 *
 * Vérification avant :
 *   SELECT COUNT(*) FROM establishments WHERE type = 'lycee' AND deleted_at IS NULL;
 *   -- attendu : 5579
 *
 * Vérification après :
 *   SELECT type, COUNT(*) FROM establishments
 *   WHERE deleted_at IS NULL AND type IN ('lycee','professionnel') GROUP BY type;
 *   -- attendu : lycee 3138, professionnel 2441
 *
 * Usage (depuis ednov-backend, .env chargé) :
 *   npx ts-node --transpile-only scripts/run-migration-1803700-reclassify-lycee.ts
 *
 * Alternative standard :
 *   npm.cmd run migration:show
 *   npm.cmd run migration:run
 *   npm.cmd run migration:revert
 */
import dataSource from '../data-source';
import { ReclassifyLyceeToProfessionnel1803700000000 } from '../migrations/1803700000000-ReclassifyLyceeToProfessionnel';

const TIMESTAMP = 1_803_700_000_000;
const NAME = 'ReclassifyLyceeToProfessionnel1803700000000';

async function main(): Promise<void> {
  await dataSource.initialize();
  const schema = (dataSource.options as { schema?: string }).schema ?? 'public';
  const migrationsTable = `"${schema}"."migrations"`;

  const existing: { count: string }[] = await dataSource.query(
    `SELECT COUNT(*)::text AS count FROM ${migrationsTable} WHERE name = $1`,
    [NAME],
  );
  if (existing[0]?.count === '1') {
    console.log(`[${NAME}] Déjà appliquée — rien à faire.`);
    await dataSource.destroy();
    return;
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const migration = new ReclassifyLyceeToProfessionnel1803700000000();
    await migration.up(queryRunner);
    await queryRunner.query(
      `INSERT INTO ${migrationsTable} (timestamp, name) VALUES ($1, $2)`,
      [TIMESTAMP, NAME],
    );
    await queryRunner.commitTransaction();
    console.log(`[${NAME}] Appliquée avec succès (timestamp=${TIMESTAMP}).`);
  } catch (e) {
    await queryRunner.rollbackTransaction();
    throw e;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
