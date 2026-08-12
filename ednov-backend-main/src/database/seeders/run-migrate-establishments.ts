import { migrateEstablishmentsFromSource } from './migrate-establishments';

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  🏫  Migration Établissements — BD source → BD cible');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Tables migrées:');
  console.log('    1. establishments           (~66 832 rows)');
  console.log('    2. rooms                    (~37 rows)');
  console.log('    3. user_establishments      (~327 rows)');
  console.log('    4. establishment_coordinators (~27 rows)');
  console.log('');

  try {
    await migrateEstablishmentsFromSource();

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log('');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`  ✅  Migration terminée en ${elapsed}s`);
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('══════════════════════════════════════════════════════════════');
    console.error('  ❌  Erreur de migration:', error);
    console.error('══════════════════════════════════════════════════════════════');
    console.error('');
    process.exit(1);
  }
}

main();
