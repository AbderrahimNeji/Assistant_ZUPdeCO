/**
 * Générateur automatique de seeders
 * 
 * Ce script crée automatiquement tous les fichiers seeder manquants
 * avec le pattern standardisé
 */

import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Configuration des seeders à générer
const SEEDERS_CONFIG = [
  {
    name: 'role-interface-elements',
    tableName: 'role_interface_elements',
    description: 'role-interface relationships',
    columns: ['id', 'company_id', 'role_id', 'element_id', 'created_at', 'updated_at', 'visibility_scope', 'order', 'visible', 'width'],
  },
  {
    name: 'users',
    tableName: 'users',
    description: 'users with self-ref managed_by',
    columns: ['id', 'company_id', 'firebase_uid', 'email', 'email_verified', 'phone', 'photo_url', 'display_name', 'first_name', 'last_name', 'status', 'last_login_at', 'created_at', 'updated_at', 'deleted_at', 'managed_by'],
    specialHandling: 'users', // Gérer managed_by séparément
  },
  {
    name: 'pairs',
    tableName: 'core_pairs',
    description: 'student-tutor pairs',
    columns: ['id', 'company_id', 'student_user_id', 'tutor_user_id', 'establishment_id', 'created_at', 'updated_at'],
  },
  {
    name: 'post-its',
    tableName: 'post_its',
    description: 'post-its',
    columns: ['id', 'company_id', 'created_by_id', 'title', 'thematic', 'content', 'deadline', 'status', 'color', 'is_archived', 'is_priority', 'created_at', 'updated_at', 'deleted_at'],
  },
  {
    name: 'user-preferences',
    tableName: 'user_interface_preferences',
    description: 'user interface preferences',
    columns: ['id', 'company_id', 'user_id', 'is_dark_mode', 'interface_configs', 'created_at', 'updated_at'],
  },
];

function generateSeederFile(config: typeof SEEDERS_CONFIG[0]): string {
  const dataImport = `import * as data from './data/${config.name}.json';`;
  const functionName = config.name.split('-').map((word, i) => 
    i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
  
  const columnsStr = config.columns.join(', ');
  const placeholders = config.columns.map((_, i) => `$${i + 1}`).join(', ');
  const values = config.columns.map((col) => `item.${col}`).join(',\n       ');

  const specialHandlingCode = config.specialHandling === 'users' ? `
    // Phase 1: Insert users without managed_by
    for (const user of items) {
      const userWithoutManagedBy = { ...user, managed_by: null };
      await ds.query(
        \`INSERT INTO ${config.tableName} (${columnsStr})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING\`,
        [${config.columns.map(c => c === 'managed_by' ? 'null' : `userWithoutManagedBy.${c}`).join(',\n       ')}]
      );
    }
    
    // Phase 2: Update managed_by for users who have it
    for (const user of items) {
      if (user.managed_by) {
        await ds.query(
          \`UPDATE ${config.tableName} SET managed_by = $1 WHERE id = $2\`,
          [user.managed_by, user.id]
        );
      }
    }` : `
    for (const item of items) {
      await ds.query(
        \`INSERT INTO ${config.tableName} (${columnsStr})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING\`,
        [${values}]
      );
    }`;

  return `import { DataSource } from 'typeorm';
${dataImport}

export async function seed${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding ${config.description}...');
  
  const items = Array.isArray(data) ? data : [];
  
  if (items.length === 0) {
    console.log('⚠️  No ${config.description} data found - please export from Supabase');
    console.log('   Run: SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM ${config.tableName} ORDER BY created_at) t');
    return;
  }

  try {${specialHandlingCode}

    console.log(\`✅ Inserted \${items.length} ${config.description}\`);
  } catch (error) {
    console.error('❌ Error seeding ${config.description}:', error);
    throw error;
  }
}
`;
}

function generateRunFile(config: typeof SEEDERS_CONFIG[0]): string {
  const functionName = config.name.split('-').map((word, i) => 
    i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
  const capitalized = functionName.charAt(0).toUpperCase() + functionName.slice(1);

  return `import { config } from 'dotenv';
import { join } from 'path';
import dataSource from '../../../data-source';
import { seed${capitalized} } from './${config.name}.seeder';

config({ path: join(__dirname, '../../../.env') });

async function main() {
  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected\\n');

    await seed${capitalized}(dataSource);

    console.log('\\n🎉 ${capitalized} seeder completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\\n❌ ${capitalized} seeder failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

main();
`;
}

function generatePlaceholderDataFile(config: typeof SEEDERS_CONFIG[0]): string {
  return `/**
 * FICHIER PLACEHOLDER - À COMPLÉTER
 * 
 * INSTRUCTIONS:
 * 1. Exécutez dans Supabase SQL Editor:
 *    SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM ${config.tableName} ORDER BY created_at) t
 * 
 * 2. Copiez le résultat (le tableau JSON) ici
 */

[]
`;
}

// Générer tous les fichiers
for (const config of SEEDERS_CONFIG) {
  const seederPath = join(__dirname, `${config.name}.seeder.ts`);
  const runPath = join(__dirname, `run-${config.name}.seeder.ts`);
  const dataPath = join(__dirname, 'data', `${config.name}.json`);

  // Générer seeder
  if (!existsSync(seederPath)) {
    writeFileSync(seederPath, generateSeederFile(config));
    console.log(`✅ Generated ${config.name}.seeder.ts`);
  }

  // Générer runner
  if (!existsSync(runPath)) {
    writeFileSync(runPath, generateRunFile(config));
    console.log(`✅ Generated run-${config.name}.seeder.ts`);
  }

  // Générer placeholder data
  if (!existsSync(dataPath)) {
    writeFileSync(dataPath, generatePlaceholderDataFile(config));
    console.log(`✅ Generated data/${config.name}.json placeholder`);
  }
}

console.log('\n🎉 All seeders generated successfully!');
console.log('Next steps:');
console.log('1. Export data from Supabase using the SQL queries in EXPORT_REMAINING.sql');
console.log('2. Fill the JSON files in data/ folder');
console.log('3. Run npm run seed:all');
