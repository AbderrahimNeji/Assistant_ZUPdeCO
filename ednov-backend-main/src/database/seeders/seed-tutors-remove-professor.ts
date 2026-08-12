import { DataSource } from 'typeorm';

/**
 * Supprime tab-professor et option-create-professor de l'interface 'tutors' (nettoyage legacy).
 * Les professeurs sont gérés uniquement dans l'interface 'volunteers'.
 */
export async function seedTutorsRemoveProfessor(ds: DataSource): Promise<void> {
  console.log('🔧 Removing professor elements from tutors interface...');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';
  const toRemove = ['tab-professor', 'option-create-professor'];

  for (const elementId of toRemove) {
    const ie = await ds.query(
      `SELECT id FROM interface_elements WHERE element_id = $1 AND interface_name = 'tutors' AND company_id = $2 AND deleted_at IS NULL`,
      [elementId, companyId],
    );

    if (ie.length === 0) {
      console.log(`   - ${elementId} → introuvable, skipped`);
      continue;
    }

    const ieId = ie[0].id;

    const deleted = await ds.query(
      `DELETE FROM role_interface_elements WHERE element_id = $1 RETURNING id`,
      [ieId],
    );
    console.log(`   ✓ RIE supprimés pour ${elementId}: ${deleted.length}`);

    await ds.query(
      `UPDATE interface_elements SET deleted_at = now() WHERE id = $1`,
      [ieId],
    );
    console.log(`   ✓ IE soft-deleted: ${elementId}`);
  }

  console.log('✅ Done');
}
