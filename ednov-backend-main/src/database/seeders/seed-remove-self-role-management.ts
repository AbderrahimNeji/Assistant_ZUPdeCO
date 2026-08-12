import { DataSource } from 'typeorm';

/**
 * Seeder standalone pour enlever les accès create/update/delete 
 * sur les utilisateurs du même rôle.
 *
 * Règles :
 * - coordinator : peut voir les autres coordinators mais ne peut plus créer/modifier/supprimer des coordinators
 * - manager : peut voir les autres managers mais ne peut plus créer/modifier/supprimer des managers
 * - tutor : peut voir les autres tutors mais ne peut plus créer/modifier/supprimer des tutors
 * - volunteer : peut voir les autres volunteers mais ne peut plus créer/modifier/supprimer des volunteers
 * - recruiter : peut voir les autres recruiters mais ne peut plus créer/modifier/supprimer des recruiters
 * - PROFESSOR : peut voir les autres professors mais ne peut plus créer/modifier/supprimer des professors
 *
 * Actions :
 * 1. Masque option-create-* pour chaque rôle sur son propre type
 * 2. Masque action-create/action-edit-row/action-delete-row pour chaque rôle sur son interface
 * 3. Garde visible=true pour les autres actions (lecture, export, etc.)
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRemoveSelfRoleManagement(ds: DataSource): Promise<void> {
  console.log('🔒 Restriction des droits de gestion des utilisateurs du même rôle...\n');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  // Configuration des restrictions par rôle
  const restrictions = [
    {
      roleCode: 'coordinator',
      interfaceName: 'admins',
      elementsToHide: [
        'option-create-coordinator',
        // Note : pour admins, les actions sont génériques, on ne peut pas filtrer par tab
        // donc on garde les actions visibles mais on masque juste l'option de création
      ],
    },
    {
      roleCode: 'manager',
      interfaceName: 'admins',
      elementsToHide: [
        'option-create-manager',
      ],
    },
    {
      roleCode: 'recruiter',
      interfaceName: 'admins',
      elementsToHide: [
        'option-create-recruiter',
      ],
    },
    {
      roleCode: 'tutor',
      interfaceName: 'tutors',
      elementsToHide: [
        'option-create-tutor',
        'action-create',
        'action-edit-row',
        'action-delete-row',
      ],
    },
    {
      roleCode: 'volunteer',
      interfaceName: 'volunteers',
      elementsToHide: [
        'option-create-volunteer',
        'action-create',
        'action-edit-row',
        'action-delete-row',
      ],
    },
    {
      roleCode: 'PROFESSOR',
      interfaceName: 'tutors',
      elementsToHide: [
        'option-create-professor',
      ],
    },
  ];

  let totalHidden = 0;
  let totalAlreadyHidden = 0;

  for (const restriction of restrictions) {
    console.log(`\n📋 Traitement du rôle: ${restriction.roleCode}`);

    for (const elementId of restriction.elementsToHide) {
      // Mettre visible=false pour ce rôle sur cet élément
      const result = await ds.query(
        `
        UPDATE role_interface_elements rie
        SET 
          visible = false,
          updated_at = now()
        FROM roles r, interface_elements ie
        WHERE rie.role_id = r.id
          AND rie.element_id = ie.id
          AND r.code = $1
          AND r.company_id = $2
          AND ie.interface_name = $3
          AND ie.element_id = $4
          AND rie.visible = true
        RETURNING rie.id
        `,
        [restriction.roleCode, companyId, restriction.interfaceName, elementId],
      );

      if (result.length > 0) {
        console.log(`  ✓ ${elementId} → masqué (visible=false)`);
        totalHidden += result.length;
      } else {
        // Vérifier si déjà masqué
        const check = await ds.query(
          `
          SELECT rie.id
          FROM role_interface_elements rie
          JOIN roles r ON rie.role_id = r.id
          JOIN interface_elements ie ON rie.element_id = ie.id
          WHERE r.code = $1
            AND r.company_id = $2
            AND ie.interface_name = $3
            AND ie.element_id = $4
            AND rie.visible = false
          `,
          [restriction.roleCode, companyId, restriction.interfaceName, elementId],
        );

        if (check.length > 0) {
          console.log(`  ⚠ ${elementId} → déjà masqué`);
          totalAlreadyHidden++;
        } else {
          console.log(`  - ${elementId} → binding non trouvé (ignoré)`);
        }
      }
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('✅ Restriction des droits terminée');
  console.log(`   • ${totalHidden} élément(s) masqué(s)`);
  console.log(`   • ${totalAlreadyHidden} élément(s) déjà masqué(s)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📢 IMPORTANT : Les utilisateurs doivent se déconnecter/reconnecter');
  console.log('   ou vider sessionStorage clé "interface-elements-store"\n');
}
