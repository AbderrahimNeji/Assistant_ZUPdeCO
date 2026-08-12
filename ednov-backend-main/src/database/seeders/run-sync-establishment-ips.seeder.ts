import { seederDataSource } from './seeder-datasource';
import { syncEstablishmentIps } from './sync-establishment-ips.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await syncEstablishmentIps(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
