import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRoleGroupsInitial } from './seed-role-groups-initial';
import { seedRolesMetadataInitial } from './seed-roles-metadata-initial';
import { seedRoleCreationSideEffects } from './seed-role-creation-side-effects';
import { seedFixIsSystemRoles } from './seed-fix-is-system-roles';
import { seedFixRoleGroupOrphan } from './seed-fix-role-group-orphan';
import { seedMissingActionIes } from './seed-missing-action-ies';
import { seedProfessorDefaults } from './seed-professor-defaults';
import { seedProfessorBindings } from './seed-professor-bindings';

/**
 * Master runner for all role-related seeders.
 * 
 * Executes in order:
 * 1. Initial role groups
 * 2. Initial roles metadata
 * 3. Role creation side effects (tabs, menus)
 * 4. Fix is_system flags
 * 5. Fix role group orphans
 * 6. Missing action interface elements
 * 7. PROFESSOR defaults
 * 8. PROFESSOR bindings
 */
(async () => {
  try {
    console.log('🚀 Starting complete roles seeding process...\n');
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 1/8: Initial Role Groups');
    console.log('═══════════════════════════════════════════════════════════\n');
    await seedRoleGroupsInitial(seederDataSource);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 2/8: Initial Roles Metadata');
    console.log('═══════════════════════════════════════════════════════════\n');
    await seedRolesMetadataInitial(seederDataSource);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 3/8: Role Creation Side Effects');
    console.log('═══════════════════════════════════════════════════════════\n');
    await seedRoleCreationSideEffects(seederDataSource);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 4/8: Fix is_system Flags');
    console.log('═══════════════════════════════════════════════════════════\n');
    await seedFixIsSystemRoles(seederDataSource);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 5/8: Fix Role Group Orphans');
    console.log('═══════════════════════════════════════════════════════════\n');
    await seedFixRoleGroupOrphan(seederDataSource);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 6/8: Missing Action Interface Elements');
    console.log('═══════════════════════════════════════════════════════════\n');
    await seedMissingActionIes(seederDataSource);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 7/8: PROFESSOR Defaults');
    console.log('═══════════════════════════════════════════════════════════\n');
    await seedProfessorDefaults(seederDataSource);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 8/8: PROFESSOR Bindings');
    console.log('═══════════════════════════════════════════════════════════\n');
    await seedProfessorBindings(seederDataSource);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎉 ALL SEEDERS COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeder process failed:', error);
    process.exit(1);
  }
})();
