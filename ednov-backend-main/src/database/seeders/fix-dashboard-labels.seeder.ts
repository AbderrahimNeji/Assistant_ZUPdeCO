import { DataSource } from 'typeorm';

const COMPANY_ID = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

export async function fixDashboardLabels(ds: DataSource): Promise<void> {
  console.log('🌱 Fixing dashboard interface element labels...');

  try {
    await ds.query(
      `UPDATE interface_elements
       SET element_label = $1, updated_at = NOW()
       WHERE element_id = $2 AND company_id = $3`,
      ['Abandons élèves présentiel', 'stat-dropouts-inperson', COMPANY_ID],
    );

    await ds.query(
      `UPDATE interface_elements
       SET element_label = $1, updated_at = NOW()
       WHERE element_id = $2 AND company_id = $3`,
      ['Abandons élèves en ligne', 'stat-dropouts-online', COMPANY_ID],
    );

    for (const elementId of ['stat-sessions-month', 'stat-sessions-by-status']) {
      await ds.query(
        `DELETE FROM role_interface_elements
         WHERE company_id = $1
           AND element_id IN (
             SELECT id FROM interface_elements
             WHERE element_id = $2 AND company_id = $1
           )`,
        [COMPANY_ID, elementId],
      );

      await ds.query(
        `DELETE FROM interface_elements
         WHERE element_id = $1 AND company_id = $2`,
        [elementId, COMPANY_ID],
      );
    }

    console.log('✅ Dashboard labels fixed and obsolete stat elements removed.');
  } catch (error) {
    console.error('❌ Error fixing dashboard labels:', error);
    throw error;
  }
}
