/**
 * Exécute uniquement la migration ManagerMenuAdminsSameEstablishmentScope1802700000000
 * et l’inscrit dans la table `migrations` pour rester aligné avec `npm run migration:run`.
 *
 * Usage (depuis ednov-backend, .env chargé) :
 *   npx ts-node --transpile-only scripts/run-migration-180270-manager-menu-admins.ts
 */
import dataSource from '../data-source';
import { ManagerMenuAdminsSameEstablishmentScope1802700000000 } from '../migrations/1802700000000-ManagerMenuAdminsSameEstablishmentScope';

const TIMESTAMP = 1_802_700_000_000;
const NAME = 'ManagerMenuAdminsSameEstablishmentScope1802700000000';

async function main(): Promise<void> {
  await dataSource.initialize();
  const schema =
    (dataSource.options as { schema?: string }).schema ?? 'public';
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
    const migration = new ManagerMenuAdminsSameEstablishmentScope1802700000000();
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
