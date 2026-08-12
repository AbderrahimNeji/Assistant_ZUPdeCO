import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { seedCompanies } from './companies.seeder';
import { seedRoles } from './roles.seeder';
import { seedInterfaceElements } from './interface-elements.seeder';
import { seedBrandings } from './brandings.seeder';
import { seedAcademic, seedHolidays } from './academic.seeder';
import { seedUsers } from './users.seeder';
import { migrateEstablishmentsFromSource } from './migrate-establishments';
import { seedRoleInterfaceElements } from './role-interface-elements.seeder';
import { seedSessions } from './sessions.seeder';
import { seedPairs } from './pairs.seeder';
import { seedPostIts } from './post-its.seeder';
import { seedUserPreferences } from './user-preferences.seeder';

config({ path: join(__dirname, '../../../.env') });

/**
 * Master seeder — seed toutes les données dans l'ordre de dépendances.
 * Logging TypeORM désactivé pour garder un output lisible.
 *
 * ORDRE :
 *  1.  companies
 *  2.  roles                        (→ companies)
 *  3.  interface_elements           (→ companies)
 *  4.  brandings                    (→ companies)
 *  5.  academic: programs, levels, subjects, school_years,
 *                vacation_zones, specialties, contact_functions,
 *                activity_types, activities, session_configs
 *  6.  users + user_roles + user_profiles   (→ companies, roles)
 *  7.  establishments (migrate BD→BD) + rooms + user_establishments
 *                                   + establishment_coordinators
 *  8.  holidays                     (→ vacation_zones, establishments)
 *  9.  role_interface_elements      (→ roles, interface_elements)
 *  10. sessions + session_participants + session_student_tutor_pairs
 *              + session_reports + session_status_history
 *              + vsc_reports + tutor_criminal_records
 *  11. core_pairs                   (→ users, establishments)
 *  12. post_its + post_it_shares    (→ companies, users)
 *  13. user_interface_preferences   (→ companies, users, interface_elements)
 */

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: process.env.DATABASE_SCHEMA || 'public',
  entities: [],
  migrations: [],
  synchronize: false,
  logging: false,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: { connectionTimeoutMillis: 10000, max: 5, idleTimeoutMillis: 30000 },
});

async function main() {
  const t0 = Date.now();

  try {
    console.log('='.repeat(80));
    console.log('🚀 MASTER SEEDER — Reproduction exacte BD Supabase');
    console.log('='.repeat(80));

    await dataSource.initialize();
    console.log('✅ Database connected\n');

    console.log('📦 [1/13] Companies...');
    await seedCompanies(dataSource);

    console.log('📦 [2/13] Roles...');
    await seedRoles(dataSource);

    console.log('📦 [3/13] Interface elements...');
    await seedInterfaceElements(dataSource);

    console.log('📦 [4/13] Brandings...');
    await seedBrandings(dataSource);

    console.log('📦 [5/13] Academic (programs, levels, subjects, school_years, vacation_zones, specialties, contact_functions, activity_types, activities, session_configs)...');
    await seedAcademic(dataSource);

    console.log('📦 [6/13] Users + user_roles + user_profiles...');
    await seedUsers(dataSource);

    console.log('📦 [7/13] Establishments (migrate BD→BD) + rooms + user_establishments + establishment_coordinators...');
    await migrateEstablishmentsFromSource();

    console.log('📦 [8/13] Holidays...');
    await seedHolidays(dataSource);

    console.log('📦 [9/13] Role-interface-elements...');
    await seedRoleInterfaceElements(dataSource);

    console.log('📦 [10/13] Sessions + session_participants + session_student_tutor_pairs + session_reports + session_status_history + vsc_reports + tutor_criminal_records...');
    await seedSessions(dataSource);

    console.log('📦 [11/13] Core pairs...');
    await seedPairs(dataSource);

    console.log('📦 [12/13] Post-its + post_it_shares...');
    await seedPostIts(dataSource);

    console.log('📦 [13/13] User interface preferences...');
    await seedUserPreferences(dataSource);

    const elapsed = Math.round((Date.now() - t0) / 1000);
    console.log('\n' + '='.repeat(80));
    console.log(`🎉 MASTER SEEDER COMPLETED in ${elapsed}s`);
    console.log('='.repeat(80));
    process.exit(0);

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ MASTER SEEDER FAILED');
    console.error('='.repeat(80));
    console.error(error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

main();
