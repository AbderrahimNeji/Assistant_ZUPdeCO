import { DataSource } from 'typeorm';

/**
 * Seeder pour pluraliser les labels des tabs admin
 *
 * Change:
 * - Manager → Managers
 * - Coordinateur → Coordinateurs
 * - Super Admin → Super Admins
 * - Recruteur → Recruteurs
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedPluralizeAdminTabs(ds: DataSource): Promise<void> {
  console.log('🔧 Pluralizing tabs labels for admins, tutors, and volunteers...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // Pluralize ADMIN tabs
    const adminsResult = await ds.query(
      `UPDATE interface_elements
       SET element_label = CASE
         WHEN element_label = 'Manager' THEN 'Managers'
         WHEN element_label = 'Coordinateur' THEN 'Coordinateurs'
         WHEN element_label = 'Super Admin' THEN 'Super Admins'
         WHEN element_label = 'Recruteur' THEN 'Recruteurs'
         ELSE element_label
       END,
       updated_at = now()
       WHERE company_id = $1::uuid
         AND interface_name = 'admins'
         AND element_type = 'tab'
         AND element_label IN ('Manager', 'Coordinateur', 'Super Admin', 'Recruteur')
       RETURNING element_id, element_label, interface_name`,
      [companyId],
    );

    console.log(`   ✓ Admins: ${adminsResult.length} tab(s) pluralisé(s)`);

    // Pluralize TUTORS tabs
    const tutorsResult = await ds.query(
      `UPDATE interface_elements
       SET element_label = CASE
         WHEN element_label = 'Tuteur' THEN 'Tuteurs'
         WHEN element_label = 'Professeur' THEN 'Professeurs'
         ELSE element_label
       END,
       updated_at = now()
       WHERE company_id = $1::uuid
         AND interface_name = 'tutors'
         AND element_type = 'tab'
         AND element_label IN ('Tuteur', 'Professeur')
       RETURNING element_id, element_label, interface_name`,
      [companyId],
    );

    console.log(`   ✓ Tutors: ${tutorsResult.length} tab(s) pluralisé(s)`);

    // Pluralize VOLUNTEERS tabs
    const volunteersResult = await ds.query(
      `UPDATE interface_elements
       SET element_label = CASE
         WHEN element_label = 'VSC' THEN 'VSC'
         WHEN element_label = 'Volontaire' THEN 'Volontaires'
         WHEN element_label = 'Professeur' THEN 'Professeurs'
         ELSE element_label
       END,
       updated_at = now()
       WHERE company_id = $1::uuid
         AND interface_name = 'volunteers'
         AND element_type = 'tab'
         AND element_label IN ('VSC', 'Volontaire', 'Professeur')
       RETURNING element_id, element_label, interface_name`,
      [companyId],
    );

    console.log(`   ✓ Volunteers: ${volunteersResult.length} tab(s) pluralisé(s)`);

    console.log('✅ All tabs labels pluralized successfully');
  } catch (error) {
    console.error('❌ Error pluralizing tabs:', error);
    throw error;
  }
}
