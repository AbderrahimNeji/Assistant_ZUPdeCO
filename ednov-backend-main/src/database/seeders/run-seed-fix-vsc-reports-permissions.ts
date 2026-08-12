import { seedFixVscReportsPermissions } from './seed-fix-vsc-reports-permissions';
import { seederDataSource } from './seeder-datasource';

async function main() {
  try {
    console.log('🚀 Démarrage du seeder: Fix VSC Reports Permissions');
    console.log('');
    
    await seederDataSource.initialize();
    console.log('✅ DataSource initialisé');
    console.log('');

    await seedFixVscReportsPermissions(seederDataSource);

    await seederDataSource.destroy();
    console.log('');
    console.log('✅ Seeder terminé avec succès');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Erreur lors du seeder:', error);
    process.exit(1);
  }
}

main();
