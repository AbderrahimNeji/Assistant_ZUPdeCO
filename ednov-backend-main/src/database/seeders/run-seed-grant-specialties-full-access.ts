import { seederDataSource } from './seeder-datasource';
import { seedGrantSpecialtiesFullAccess } from './seed-grant-specialties-full-access';

async function main() {
  console.log('🚀 Lancement du seeder: accord accès spécialités pour coordinator & manager\n');

  try {
    console.log('📦 Initialisation de la connexion à la base de données...');
    await seederDataSource.initialize();
    console.log('✓ Connexion établie\n');

    await seedGrantSpecialtiesFullAccess(seederDataSource);

    console.log('\n🎉 Seeder exécuté avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Erreur fatale lors de l\'exécution du seeder:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) {
      console.log('\n🔌 Fermeture de la connexion...');
      await seederDataSource.destroy();
      console.log('✓ Connexion fermée');
    }
  }
}

main();
