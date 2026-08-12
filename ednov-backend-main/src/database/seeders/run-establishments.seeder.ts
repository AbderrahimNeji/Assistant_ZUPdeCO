import { migrateEstablishmentsFromSource } from './migrate-establishments';

async function main() {
  try {
    await migrateEstablishmentsFromSource();
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  }
}

main();
