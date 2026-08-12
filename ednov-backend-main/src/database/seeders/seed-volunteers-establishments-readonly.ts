import { DataSource } from 'typeorm';

/**
 * SEED: Rendre les établissements readonly pour tous les rôles du rolegroup 'volunteers'
 * 
 * OBJECTIF:
 * Les utilisateurs avec des rôles dans le rolegroup 'volunteers' (volunteer, professor) peuvent :
 * - ✅ Voir le menu establishments (UNIQUEMENT leurs établissements affectés)
 * - ✅ Accéder à la page establishments
 * - ✅ Voir les détails d'un établissement (UNIQUEMENT ceux auxquels ils sont affectés)
 * - ✅ Utiliser les filtres
 * - ✅ Voir les statistiques et graphiques
 * - ❌ NE PEUVENT PAS créer
 * - ❌ NE PEUVENT PAS modifier
 * - ❌ NE PEUVENT PAS supprimer
 * - ❌ NE PEUVENT PAS exporter
 * 
 * NOTE IMPORTANTE:
 * Le filtrage par affectation se fait automatiquement via la table user_establishments
 * au niveau backend (pas via visibility_scope). Le visibility_scope reste NULL pour
 * l'interface establishments (comme pour coordinator).
 * 
 * Idempotent: safe to run multiple times.
 */
export async function seedVolunteersEstablishmentsReadonly(ds: DataSource): Promise<void> {
  console.log('🔒 Configuration des établissements en lecture seule pour le rolegroup "volunteers"...');
  console.log('');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';
    
    let totalAdded = 0;
    let totalRemoved = 0;
    let totalSkipped = 0;

    // 1️⃣ Récupérer tous les rôles du rolegroup 'volunteers'
    console.log('📋 Étape 1: Récupération des rôles du rolegroup "volunteers"...');
    const volunteerRoles = await ds.query(
      `SELECT id, code, label FROM roles WHERE role_group = 'volunteers' AND deleted_at IS NULL`,
    );

    if (volunteerRoles.length === 0) {
      console.warn('⚠️  Aucun rôle trouvé dans le rolegroup "volunteers"');
      return;
    }

    console.log(`   ✓ ${volunteerRoles.length} rôle(s) trouvé(s):`);
    volunteerRoles.forEach((role: any) => {
      console.log(`     - ${role.code} (${role.label})`);
    });
    console.log('');

    // 2️⃣ Actions à SUPPRIMER (écriture interdite + export)
    console.log('📋 Étape 2: Suppression des actions d\'écriture et d\'export...');
    const writeActions = ['action-create', 'action-edit-row', 'action-delete-row', 'action-export-excel'];
    
    for (const role of volunteerRoles) {
      for (const actionId of writeActions) {
        const result = await ds.query(
          `DELETE FROM role_interface_elements
           WHERE company_id = $1
             AND role_id = $2
             AND element_id = (
               SELECT id FROM interface_elements 
               WHERE interface_name = 'establishments' 
                 AND element_id = $3
                 AND deleted_at IS NULL
               LIMIT 1
             )
           RETURNING id`,
          [companyId, role.id, actionId],
        );

        if (result.length > 0) {
          totalRemoved++;
          console.log(`   ✓ [${role.code}] establishments.${actionId} → supprimé`);
        }
      }
    }

    if (totalRemoved === 0) {
      console.log('   ℹ️  Aucune action d\'écriture à supprimer (déjà propre)');
    }
    console.log('');

    // 3️⃣ Actions à AJOUTER (lecture seule uniquement, filtrage par user_establishments)
    console.log('📋 Étape 3: Ajout des actions de lecture seule (filtrage via user_establishments)...');
    const readActions = [
      { elementId: 'action-view-row', label: 'Voir les détails', visible: true, order: 1 },
    ];

    for (const role of volunteerRoles) {
      for (const action of readActions) {
        const result = await ds.query(
          `INSERT INTO role_interface_elements (
             id, company_id, role_id, element_id, visible, "order", created_at, updated_at
           )
           SELECT 
             gen_random_uuid(),
             $1,
             $2,
             ie.id,
             $3,
             $4,
             NOW(),
             NOW()
           FROM interface_elements ie
           WHERE ie.interface_name = 'establishments'
             AND ie.element_id = $5
             AND ie.deleted_at IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM role_interface_elements rie
               WHERE rie.role_id = $2
                 AND rie.element_id = ie.id
             )
           RETURNING id`,
          [companyId, role.id, action.visible, action.order, action.elementId],
        );

        if (result.length > 0) {
          totalAdded++;
          console.log(`   ✓ [${role.code}] establishments.${action.elementId} → ajouté`);
        } else {
          totalSkipped++;
        }
      }
    }

    if (totalAdded === 0 && totalSkipped > 0) {
      console.log('   ℹ️  Toutes les actions de lecture étaient déjà configurées');
    }
    console.log('');

    // 4️⃣ S'assurer que le menu establishments est visible (filtrage via user_establishments)
    console.log('📋 Étape 4: Vérification de la visibilité du menu (filtrage via user_establishments)...');
    let menuAdded = 0;

    for (const role of volunteerRoles) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
           id, company_id, role_id, element_id, visible, "order", created_at, updated_at
         )
         SELECT 
           gen_random_uuid(),
           $1,
           $2,
           ie.id,
           true,
           10,
           NOW(),
           NOW()
         FROM interface_elements ie
         WHERE ie.interface_name = 'sidebar'
           AND ie.element_id = 'menu-establishments'
           AND ie.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM role_interface_elements rie
             WHERE rie.role_id = $2
               AND rie.element_id = ie.id
           )
         RETURNING id`,
        [companyId, role.id],
      );

      if (result.length > 0) {
        menuAdded++;
        console.log(`   ✓ [${role.code}] menu-establishments → ajouté`);
      }
    }

    if (menuAdded === 0) {
      console.log('   ℹ️  Le menu establishments était déjà visible pour tous les rôles');
    }
    console.log('');

    // 5️⃣ Résumé final
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ CONFIGURATION TERMINÉE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   📊 Actions de lecture ajoutées    : ${totalAdded}`);
    console.log(`   🗑️  Actions d'écriture supprimées  : ${totalRemoved}`);
    console.log(`   ↔️  Déjà configurées (ignorées)    : ${totalSkipped}`);
    console.log(`   📋 Menus ajoutés                   : ${menuAdded}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Les utilisateurs doivent se DÉCONNECTER/RECONNECTER');
    console.log('   pour voir les changements (ou vider sessionStorage clé "interface-elements-store")');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    throw error;
  }
}
