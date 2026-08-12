import { config } from 'dotenv';
import { join } from 'path';
import dataSource from '../../data-source';

config({ path: join(__dirname, '../../.env') });

async function main() {
  try {
    console.log('🔌 Connexion à la base...');
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    console.log('✅ Connecté\n');

    await dataSource.query(`
      ALTER TABLE user_roles
      ADD COLUMN IF NOT EXISTS role_label VARCHAR(255)
    `);
    
    console.log('✅ Colonne role_label ajoutée à user_roles');

    await dataSource.destroy();
    console.log('\n🔌 Connexion fermée');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration échouée:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

main();
