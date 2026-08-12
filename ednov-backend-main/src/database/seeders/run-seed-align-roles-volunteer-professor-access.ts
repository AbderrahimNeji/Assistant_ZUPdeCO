#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedAlignRolesVolunteerProfessorAccess } from './seed-align-roles-volunteer-professor-access';

/**
 * Runner pour aligner les accès professor avec volunteer
 * pour coordinator, manager, super_admin et volunteer
 * 
 * Ce seeder garantit que :
 * - coordinator/manager/super_admin ont les mêmes accès sur professor que sur volunteer
 * - volunteer (VSC) voit les professeurs (same_establishment) + détail ; pas les options création/édition prof
 * - professor voit les VSC (onglet + liste + détail, same_establishment) sans actions d’écriture sur l’interface volunteers
 * 
 * Usage :
 *   npm.cmd run seed:align-professor-access
 * 
 * Ou directement :
 *   npx ts-node --transpile-only src/database/seeders/run-seed-align-roles-volunteer-professor-access.ts
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedAlignRolesVolunteerProfessorAccess(seederDataSource);

    console.log('\n🎉 Professor access alignment completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Alignment seeder failed:', error);
    process.exit(1);
  }
})();
