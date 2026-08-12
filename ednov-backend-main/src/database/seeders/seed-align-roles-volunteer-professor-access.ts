import { DataSource } from 'typeorm';

/**
 * Seeder pour ALIGNER les accès professor avec volunteer pour coordinator, super_admin et manager
 * 
 * Ce seeder garantit que :
 * 1. coordinator, super_admin et manager ont les MÊMES accès sur professor que sur volunteer
 *    (même visibility_scope, même visible, même order)
 * 2. volunteer (VSC) a un accès same_establishment sur professor (lecture uniquement : onglet + détail)
 * 3. professor voit les VSC (onglet tab-volunteer + liste + détail) en same_establishment, sans création / édition / suppression sur l’interface volunteers
 * 
 * Objectif : coordinator/manager/super_admin doivent pouvoir gérer professors exactement comme volunteers
 *            volunteer doit voir les professors du même établissement
 * 
 * Idempotent: safe to run multiple times.
 */
export async function seedAlignRolesVolunteerProfessorAccess(
  ds: DataSource,
): Promise<void> {
  console.log('🔄 Aligning coordinator/manager/super_admin/volunteer access on professor elements...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // ─── ÉTAPE 1: Récupérer les IDs des rôles ────────────────────────────────
    const roles = await ds.query<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM roles 
       WHERE code IN ('coordinator', 'manager', 'super_admin', 'admin', 'volunteer') 
       AND company_id = $1::uuid 
       AND deleted_at IS NULL`,
      [companyId],
    );

    const coordinatorRole = roles.find((r) => r.code === 'coordinator');
    const managerRole = roles.find((r) => r.code === 'manager');
    /** Tenant uses role code `admin` with role_group super_admin — no separate `super_admin` row. */
    const superAdminRole =
      roles.find((r) => r.code === 'super_admin') ?? roles.find((r) => r.code === 'admin');
    const volunteerRole = roles.find((r) => r.code === 'volunteer');

    if (!coordinatorRole || !managerRole || !volunteerRole) {
      console.error('❌ Rôles coordinator, manager ou volunteer introuvables');
      return;
    }

    console.log(`   ✓ Coordinator role ID: ${coordinatorRole.id}`);
    console.log(`   ✓ Manager role ID: ${managerRole.id}`);
    console.log(
      `   ✓ Super-admin bucket role ID (super_admin ou admin): ${superAdminRole?.id || 'N/A'}`,
    );
    console.log(`   ✓ Volunteer role ID: ${volunteerRole.id}`);

    // ─── ÉTAPE 2: Récupérer tous les éléments professor ──────────────────────
    interface InterfaceElement {
      id: string;
      element_id: string;
      interface_name: string;
      element_type: string;
    }

    const professorElements = await ds.query<InterfaceElement[]>(
      `SELECT id, element_id, interface_name, element_type
       FROM interface_elements
       WHERE element_id LIKE '%professor%'
       AND deleted_at IS NULL
       ORDER BY interface_name, element_id`,
    );

    console.log(`\n   → ${professorElements.length} éléments professor trouvés`);

    // ─── ÉTAPE 3: Pour coordinator, manager, super_admin ─────────────────────
    // Trouver l'élément volunteer équivalent et copier le visibility_scope
    
    const adminRoles = [coordinatorRole, managerRole];
    if (superAdminRole) adminRoles.push(superAdminRole);

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const role of adminRoles) {
      console.log(`\n   📋 Traitement du rôle ${role.code}...`);
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const professorElem of professorElements) {
        // Trouver l'élément volunteer équivalent (remplacer -professor par -volunteer dans l'ID)
        const volunteerElementId = professorElem.element_id.replace(
          'professor',
          'volunteer',
        );

        // Récupérer le binding volunteer pour ce rôle
        const volunteerBinding = await ds.query<
          Array<{
            visibility_scope: any;
            visible: boolean;
            order: number | null;
          }>
        >(
          `SELECT rie.visibility_scope, rie.visible, rie."order"
           FROM role_interface_elements rie
           JOIN interface_elements ie ON ie.id = rie.element_id
           WHERE rie.role_id = $1::uuid
           AND ie.element_id = $2
           AND ie.interface_name = $3
           AND ie.deleted_at IS NULL
           LIMIT 1`,
          [role.id, volunteerElementId, professorElem.interface_name],
        );

        if (volunteerBinding.length === 0) {
          // Pas de binding volunteer pour cet élément, on skip
          skipped++;
          continue;
        }

        const volunteerData = volunteerBinding[0];

        // Vérifier si le binding professor existe déjà pour ce rôle
        const existingProfessorBinding = await ds.query(
          `SELECT id, visibility_scope, visible, "order"
           FROM role_interface_elements
           WHERE role_id = $1::uuid
           AND element_id = $2::uuid`,
          [role.id, professorElem.id],
        );

        if (existingProfessorBinding.length === 0) {
          // Créer le binding
          await ds.query(
            `INSERT INTO role_interface_elements 
             (id, company_id, role_id, element_id, visibility_scope, visible, "order", created_at, updated_at)
             VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, NOW(), NOW())`,
            [
              companyId,
              role.id,
              professorElem.id,
              volunteerData.visibility_scope,
              volunteerData.visible,
              volunteerData.order,
            ],
          );
          inserted++;
        } else {
          // Mettre à jour le binding si nécessaire
          const existing = existingProfessorBinding[0];
          const scopeChanged =
            JSON.stringify(existing.visibility_scope) !==
            JSON.stringify(volunteerData.visibility_scope);
          const visibleChanged = existing.visible !== volunteerData.visible;
          const orderChanged = existing.order !== volunteerData.order;

          if (scopeChanged || visibleChanged || orderChanged) {
            await ds.query(
              `UPDATE role_interface_elements
               SET visibility_scope = $1,
                   visible = $2,
                   "order" = $3,
                   updated_at = NOW()
               WHERE role_id = $4::uuid
               AND element_id = $5::uuid`,
              [
                volunteerData.visibility_scope,
                volunteerData.visible,
                volunteerData.order,
                role.id,
                professorElem.id,
              ],
            );
            updated++;
          } else {
            skipped++;
          }
        }
      }

      console.log(
        `      ✓ ${role.code}: ${inserted} insérés, ${updated} mis à jour, ${skipped} inchangés`,
      );
      totalInserted += inserted;
      totalUpdated += updated;
      totalSkipped += skipped;
    }

    // ─── ÉTAPE 4: Pour volunteer → same_establishment sur professor ──────────
    console.log(`\n   📋 Traitement du rôle volunteer...`);
    let volunteerInserted = 0;
    let volunteerUpdated = 0;
    let volunteerSkipped = 0;

    const sameEstablishmentScope = {
      logic: 'AND',
      relations: ['same_establishment'],
    };

    for (const professorElem of professorElements) {
      // Pour volunteer, on donne accès en lecture avec same_establishment
      // On ne donne accès qu'aux tabs et menu (pas aux actions create/edit)
      const allowedTypes = ['tab', 'menu', 'section'];
      
      if (!allowedTypes.includes(professorElem.element_type)) {
        // Skip les actions create/edit pour volunteer
        volunteerSkipped++;
        continue;
      }

      // Vérifier si le binding existe
      const existingBinding = await ds.query(
        `SELECT id, visibility_scope, visible, "order"
         FROM role_interface_elements
         WHERE role_id = $1::uuid
         AND element_id = $2::uuid`,
        [volunteerRole.id, professorElem.id],
      );

      if (existingBinding.length === 0) {
        // Créer le binding avec same_establishment
        await ds.query(
          `INSERT INTO role_interface_elements 
           (id, company_id, role_id, element_id, visibility_scope, visible, "order", created_at, updated_at)
           VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, NOW(), NOW())`,
          [
            companyId,
            volunteerRole.id,
            professorElem.id,
            sameEstablishmentScope,
            true,
            2, // order par défaut
          ],
        );
        volunteerInserted++;
      } else {
        // Mettre à jour avec same_establishment si nécessaire
        const existing = existingBinding[0];
        const scopeChanged =
          JSON.stringify(existing.visibility_scope) !==
          JSON.stringify(sameEstablishmentScope);
        const visibleChanged = existing.visible !== true;

        if (scopeChanged || visibleChanged) {
          await ds.query(
            `UPDATE role_interface_elements
             SET visibility_scope = $1,
                 visible = $2,
                 updated_at = NOW()
             WHERE role_id = $3::uuid
             AND element_id = $4::uuid`,
            [
              sameEstablishmentScope,
              true,
              volunteerRole.id,
              professorElem.id,
            ],
          );
          volunteerUpdated++;
        } else {
          volunteerSkipped++;
        }
      }
    }

    console.log(
      `      ✓ volunteer: ${volunteerInserted} insérés, ${volunteerUpdated} mis à jour, ${volunteerSkipped} inchangés`,
    );

    // ─── ÉTAPE 5: VSC — voir professeurs (même établissement) sans créer/modifier ─
    console.log(`\n   📋 Étape 5 — volunteer : lecture cross-professor + onglet VSC…`);
    const volunteerRolesAll = await ds.query<Array<{ id: string; company_id: string }>>(
      `SELECT id, company_id FROM roles WHERE deleted_at IS NULL AND LOWER(code) = 'volunteer'`,
    );
    let volCrossUpserts = 0;
    let volOptsRemoved = 0;
    for (const vr of volunteerRolesAll) {
      const upsertRow = await ds.query(
        `INSERT INTO role_interface_elements
           (id, company_id, role_id, element_id, visibility_scope, visible, "order", created_at, updated_at)
         SELECT gen_random_uuid(), r.company_id, r.id, ie.id, $3::jsonb, true, 0, NOW(), NOW()
         FROM roles r
         INNER JOIN interface_elements ie
           ON ie.company_id = r.company_id
           AND ie.interface_name = 'volunteers'
           AND ie.element_id = $2::varchar
           AND ie.deleted_at IS NULL
         WHERE r.id = $1::uuid AND r.deleted_at IS NULL
         ON CONFLICT (role_id, element_id) DO UPDATE SET
           visibility_scope = EXCLUDED.visibility_scope,
           visible = EXCLUDED.visible,
           "order" = EXCLUDED."order",
           updated_at = NOW()
         RETURNING id`,
        [vr.id, 'action-view-row', JSON.stringify(sameEstablishmentScope)],
      );
      if (upsertRow.length > 0) volCrossUpserts++;

      const upsertTab = await ds.query(
        `INSERT INTO role_interface_elements
           (id, company_id, role_id, element_id, visibility_scope, visible, "order", created_at, updated_at)
         SELECT gen_random_uuid(), r.company_id, r.id, ie.id, NULL, true, 0, NOW(), NOW()
         FROM roles r
         INNER JOIN interface_elements ie
           ON ie.company_id = r.company_id
           AND ie.interface_name = 'volunteers'
           AND ie.element_id = 'tab-volunteer'
           AND ie.deleted_at IS NULL
         WHERE r.id = $1::uuid AND r.deleted_at IS NULL
         ON CONFLICT (role_id, element_id) DO UPDATE SET
           visibility_scope = NULL,
           visible = true,
           updated_at = NOW()
         RETURNING id`,
        [vr.id],
      );
      if (upsertTab.length > 0) volCrossUpserts++;

      const delOpts = await ds.query(
        `DELETE FROM role_interface_elements rie
         USING interface_elements ie
         WHERE rie.element_id = ie.id
           AND rie.role_id = $1::uuid
           AND ie.interface_name = 'volunteers'
           AND ie.element_id IN ('option-create-professor', 'option-edit-professor')
         RETURNING rie.id`,
        [vr.id],
      );
      volOptsRemoved += delOpts.length;
    }
    console.log(
      `      ✓ volunteer cross-read (action-view + tab-volunteer): ${volCrossUpserts} upserts (lignes retournées), options prof retirées: ${volOptsRemoved}`,
    );

    // ─── ÉTAPE 6: Professor — voir VSC (même établissement), sans écriture volunteers ─
    console.log(`\n   📋 Étape 6 — professor : lecture VSC seulement…`);
    const professorRolesAll = await ds.query<Array<{ id: string; company_id: string }>>(
      `SELECT id, company_id FROM roles WHERE deleted_at IS NULL AND LOWER(code) = 'professor'`,
    );
    let profCrossUpserts = 0;
    let profWritesHidden = 0;
    const writeElementIds = [
      'action-create',
      'action-edit-row',
      'action-delete-row',
      'option-create-volunteer',
      'option-edit-volunteer',
      'action-export-excel',
    ];
    for (const pr of professorRolesAll) {
      const insTab = await ds.query(
        `INSERT INTO role_interface_elements
           (id, company_id, role_id, element_id, visibility_scope, visible, "order", created_at, updated_at)
         SELECT gen_random_uuid(), r.company_id, r.id, ie.id, $2::jsonb, true, 0, NOW(), NOW()
         FROM roles r
         INNER JOIN interface_elements ie
           ON ie.company_id = r.company_id
           AND ie.interface_name = 'volunteers'
           AND ie.element_id = 'tab-volunteer'
           AND ie.deleted_at IS NULL
         WHERE r.id = $1::uuid AND r.deleted_at IS NULL
         ON CONFLICT (role_id, element_id) DO UPDATE SET
           visibility_scope = EXCLUDED.visibility_scope,
           visible = true,
           updated_at = NOW()
         RETURNING id`,
        [pr.id, JSON.stringify(sameEstablishmentScope)],
      );
      if (insTab.length > 0) profCrossUpserts++;

      const insView = await ds.query(
        `INSERT INTO role_interface_elements
           (id, company_id, role_id, element_id, visibility_scope, visible, "order", created_at, updated_at)
         SELECT gen_random_uuid(), r.company_id, r.id, ie.id, $2::jsonb, true, 0, NOW(), NOW()
         FROM roles r
         INNER JOIN interface_elements ie
           ON ie.company_id = r.company_id
           AND ie.interface_name = 'volunteers'
           AND ie.element_id = 'action-view-row'
           AND ie.deleted_at IS NULL
         WHERE r.id = $1::uuid AND r.deleted_at IS NULL
         ON CONFLICT (role_id, element_id) DO UPDATE SET
           visibility_scope = EXCLUDED.visibility_scope,
           visible = true,
           updated_at = NOW()
         RETURNING id`,
        [pr.id, JSON.stringify(sameEstablishmentScope)],
      );
      if (insView.length > 0) profCrossUpserts++;

      const insProfTab = await ds.query(
        `INSERT INTO role_interface_elements
           (id, company_id, role_id, element_id, visibility_scope, visible, "order", created_at, updated_at)
         SELECT gen_random_uuid(), r.company_id, r.id, ie.id, $2::jsonb, true, 2, NOW(), NOW()
         FROM roles r
         INNER JOIN interface_elements ie
           ON ie.company_id = r.company_id
           AND ie.interface_name = 'volunteers'
           AND ie.element_id = 'tab-professor'
           AND ie.deleted_at IS NULL
         WHERE r.id = $1::uuid AND r.deleted_at IS NULL
         ON CONFLICT (role_id, element_id) DO UPDATE SET
           visibility_scope = COALESCE(EXCLUDED.visibility_scope, role_interface_elements.visibility_scope),
           visible = true,
           updated_at = NOW()
         RETURNING id`,
        [pr.id, JSON.stringify(sameEstablishmentScope)],
      );
      if (insProfTab.length > 0) profCrossUpserts++;

      const hidden = await ds.query(
        `UPDATE role_interface_elements rie
         SET visible = false,
             visibility_scope = NULL,
             updated_at = NOW()
         FROM interface_elements ie
         WHERE rie.element_id = ie.id
           AND rie.role_id = $1::uuid
           AND ie.company_id = (SELECT company_id FROM roles WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1)
           AND ie.interface_name = 'volunteers'
           AND ie.element_id = ANY($2::varchar[])
           AND ie.deleted_at IS NULL
         RETURNING rie.id`,
        [pr.id, writeElementIds],
      );
      profWritesHidden += hidden.length;
    }
    console.log(
      `      ✓ professor tab-VSC + view: ${profCrossUpserts} upserts, actions écriture masquées: ${profWritesHidden}`,
    );

    // ─── ÉTAPE 7: Rapport final ──────────────────────────────────────────────
    console.log('\n📊 Résumé de l\'alignement :');
    console.log(
      `   Admin roles (coordinator/manager/super_admin): ${totalInserted} insérés, ${totalUpdated} mis à jour`,
    );
    console.log(
      `   Volunteer role (onglets professor): ${volunteerInserted} insérés, ${volunteerUpdated} mis à jour`,
    );
    console.log(
      '\n✅ Alignement des accès professor terminé avec succès',
    );
  } catch (error) {
    console.error(
      '❌ Erreur lors de l\'alignement des accès professor:',
      error,
    );
    throw error;
  }
}
