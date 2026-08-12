import { DataSource } from 'typeorm';

/**
 * FIX URGENT: Ajoute les actions manquantes pour volunteer et PROFESSOR
 * 
 * PROBLÈMES CORRIGÉS:
 * 1. volunteer n'a AUCUNE action dans tutors/students
 * 2. volunteer n'a que action-create dans sessions (manque edit/delete/cancel)
 * 3. action-cancel-row n'existe pour AUCUN rôle
 * 4. PROFESSOR manque action-delete-row dans sessions/students
 * 
 * Idempotent: safe to run multiple times.
 */
export async function seedFixVolunteerProfessorActions(ds: DataSource): Promise<void> {
  console.log('🔧 FIX URGENT: Ajout des actions manquantes pour volunteer et PROFESSOR...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // Configuration des actions à ajouter par rôle et interface
    const actionsToAdd = [
      // VOLUNTEER - sessions (manque edit, delete, cancel)
      { roleCode: 'volunteer', interface: 'sessions', elementId: 'action-edit-row', visible: true },
      { roleCode: 'volunteer', interface: 'sessions', elementId: 'action-delete-row', visible: true },
      { roleCode: 'volunteer', interface: 'sessions', elementId: 'action-cancel-row', visible: true },
      { roleCode: 'volunteer', interface: 'sessions', elementId: 'action-view-row', visible: true },

      // VOLUNTEER - students (manque TOUT)
      { roleCode: 'volunteer', interface: 'students', elementId: 'action-create', visible: true },
      { roleCode: 'volunteer', interface: 'students', elementId: 'action-edit-row', visible: true },
      { roleCode: 'volunteer', interface: 'students', elementId: 'action-delete-row', visible: true },
      { roleCode: 'volunteer', interface: 'students', elementId: 'action-view-row', visible: true },

      // VOLUNTEER - tutors (manque TOUT)
      { roleCode: 'volunteer', interface: 'tutors', elementId: 'action-create', visible: true },
      { roleCode: 'volunteer', interface: 'tutors', elementId: 'action-edit-row', visible: true },
      { roleCode: 'volunteer', interface: 'tutors', elementId: 'action-delete-row', visible: true },
      { roleCode: 'volunteer', interface: 'tutors', elementId: 'action-view-row', visible: true },

      // PROFESSOR - sessions (manque delete et cancel)
      { roleCode: 'PROFESSOR', interface: 'sessions', elementId: 'action-delete-row', visible: false },
      { roleCode: 'PROFESSOR', interface: 'sessions', elementId: 'action-cancel-row', visible: true },

      // PROFESSOR - students (manque delete)
      { roleCode: 'PROFESSOR', interface: 'students', elementId: 'action-delete-row', visible: false },

      // ADMIN, COORDINATOR, MANAGER - action-cancel-row (manque partout)
      { roleCode: 'admin', interface: 'sessions', elementId: 'action-cancel-row', visible: true },
      { roleCode: 'coordinator', interface: 'sessions', elementId: 'action-cancel-row', visible: true },
      { roleCode: 'manager', interface: 'sessions', elementId: 'action-cancel-row', visible: true },
    ];

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const action of actionsToAdd) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          id,
          company_id,
          role_id,
          element_id,
          visible,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          $1::uuid,
          r.id,
          ie.id,
          $4::boolean,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $3::varchar
          AND ie.interface_name = $2::varchar
          AND ie.deleted_at IS NULL
        WHERE r.code = $5::varchar
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [
          companyId,
          action.interface,
          action.elementId,
          action.visible,
          action.roleCode,
        ],
      );

      if (result.length > 0) {
        totalInserted++;
        console.log(`   ✓ [${action.roleCode}] ${action.interface}.${action.elementId} → ajouté`);
      } else {
        totalSkipped++;
      }
    }

    console.log('');
    console.log(`✅ FIX TERMINÉ:`);
    console.log(`   - ${totalInserted} actions ajoutées`);
    console.log(`   - ${totalSkipped} déjà existantes (ignorées)`);
    console.log('');
    console.log('⚠️  IMPORTANT: Les utilisateurs doivent se DÉCONNECTER/RECONNECTER pour voir les changements');
    console.log('   (ou vider sessionStorage clé "interface-elements-store")');
  } catch (error) {
    console.error('❌ Erreur lors du fix des actions:', error);
    throw error;
  }
}
