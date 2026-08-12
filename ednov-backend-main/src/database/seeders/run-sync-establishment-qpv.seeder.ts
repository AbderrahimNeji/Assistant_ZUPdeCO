import { seederDataSource } from './seeder-datasource';
import { syncEstablishmentQpv } from './sync-establishment-qpv.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await syncEstablishmentQpv(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
