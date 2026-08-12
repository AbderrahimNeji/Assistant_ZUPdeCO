import { seedFixMenuAdminsVolunteersRie } from './seed-fix-menu-admins-volunteers-rie';
import { seederDataSource } from './seeder-datasource';

async function main() {
  try {
    await seederDataSource.initialize();
    console.log('✅ DataSource initialisé');

    await seedFixMenuAdminsVolunteersRie(seederDataSource);

    await seederDataSource.destroy();
    console.log('✅ Seeder terminé avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seeder:', error);
    process.exit(1);
  }
}

main();
