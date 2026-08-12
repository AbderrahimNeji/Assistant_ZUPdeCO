import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';

/**
 * Seeder to normalize empty visibility_scope values.
 * Converts visibility_scope = '{}' to NULL for consistency.
 * 
 * Usage: npm run ts-node src/database/seeders/run-seed-fix-empty-visibility-scopes.ts
 */
async function fixEmptyVisibilityScopes() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('🔄 Normalizing empty visibility_scope values...');

    const result = await dataSource.query(`
      UPDATE role_interface_elements
      SET visibility_scope = NULL
      WHERE visibility_scope::text = '{}'
       OR visibility_scope::text = 'null';
    `);

    console.log(`✅ Updated ${result[1]} rows (visibility_scope {} or 'null' → NULL)`);

    // Also fix any visibility_scope that are literally the string "null" instead of SQL NULL
    const result2 = await dataSource.query(`
      UPDATE role_interface_elements
      SET visibility_scope = NULL
      WHERE visibility_scope IS NOT NULL
        AND visibility_scope::text = 'null';
    `);

    console.log(`✅ Fixed ${result2[1]} rows with string "null" → NULL`);

    console.log('✨ Migration complete!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await app.close();
  }
}

fixEmptyVisibilityScopes();
