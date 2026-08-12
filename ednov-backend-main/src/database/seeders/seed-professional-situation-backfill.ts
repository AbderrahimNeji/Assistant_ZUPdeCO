import type { DataSource } from 'typeorm';

/**
 * Assigns a random professional situation to tutor user_profiles where the column is still NULL.
 * Idempotent: only updates rows with professional_situation IS NULL.
 */
export async function seedProfessionalSituationBackfill(ds: DataSource): Promise<void> {
  await ds.query(`
    UPDATE user_profiles up
    SET professional_situation = (
      ARRAY['employee', 'student', 'retired']::professional_situation_enum[]
    )[1 + floor(random() * 3)::int]
    WHERE up.professional_situation IS NULL
      AND EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = up.user_id
          AND UPPER(TRIM(r.code)) = 'TUTOR'
      )
  `);
  console.log('[seed] professional_situation random backfill completed');
}
