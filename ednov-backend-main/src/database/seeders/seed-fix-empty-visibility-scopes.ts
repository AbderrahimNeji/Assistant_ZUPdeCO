import { DataSource } from 'typeorm';

/**
 * Normalizes empty visibility_scope values in role_interface_elements table.
 * Converts '{}' → NULL for consistency.
 */
export async function seedFixEmptyVisibilityScopes(dataSource: DataSource): Promise<void> {
  console.log('🔄 [seed-fix-empty-visibility-scopes] Starting normalization...');

  const result = await dataSource.query(`
    UPDATE role_interface_elements
    SET visibility_scope = NULL
    WHERE visibility_scope::text = '{}';
  `);

  console.log(`✅ [seed-fix-empty-visibility-scopes] Normalized ${result[1]} rows (visibility_scope {} → NULL)`);
}
