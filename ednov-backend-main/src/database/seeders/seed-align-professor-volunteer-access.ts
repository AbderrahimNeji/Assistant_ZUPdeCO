import { DataSource } from 'typeorm';

/**
 * Seeder pour ALIGNER les accès et visibility scopes du rôle PROFESSOR
 * sur ceux du rôle volunteer, pour TOUS les modules.
 *
 * Ce seeder :
 * 1. Copie TOUS les role_interface_elements de volunteer vers PROFESSOR
 * 2. Aligne les visibility_scope pour qu'ils soient IDENTIQUES
 * 3. Synchronise visible et order
 * 4. Couvre TOUS les modules : sidebar, sessions, students, tutors, volunteers, dashboard, etc.
 *
 * Objectif : PROFESSOR et volunteer doivent avoir exactement les mêmes accès et scopes.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedAlignProfessorVolunteerAccess(
  ds: DataSource,
): Promise<void> {
  console.log('🔄 Aligning PROFESSOR access with volunteer...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // ─── ÉTAPE 1: Récupérer les IDs des rôles ────────────────────────────────
    const roles = await ds.query<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM roles 
       WHERE code IN ('volunteer', 'PROFESSOR') 
       AND company_id = $1::uuid 
       AND deleted_at IS NULL`,
      [companyId],
    );

    const volunteerRole = roles.find((r) => r.code === 'volunteer');
    const professorRole = roles.find((r) => r.code === 'PROFESSOR');

    if (!volunteerRole || !professorRole) {
      console.error('❌ Rôles volunteer ou PROFESSOR introuvables');
      return;
    }

    console.log(`   ✓ Volunteer role ID: ${volunteerRole.id}`);
    console.log(`   ✓ Professor role ID: ${professorRole.id}`);

    // ─── ÉTAPE 2: Récupérer TOUS les bindings de volunteer ───────────────────
    interface VolunteerBinding {
      element_id: string;
      interface_name: string;
      element_type: string;
      visibility_scope: any;
      visible: boolean | null;
      order: number | null;
    }

    const volunteerBindings = await ds.query<VolunteerBinding[]>(
      `SELECT 
        ie.id as element_id,
        ie.interface_name,
        ie.element_type,
        rie.visibility_scope,
        rie.visible,
        rie."order"
       FROM role_interface_elements rie
       JOIN interface_elements ie ON ie.id = rie.element_id
       WHERE rie.role_id = $1::uuid
       AND ie.deleted_at IS NULL
       ORDER BY ie.interface_name, ie.element_type, ie.element_id`,
      [volunteerRole.id],
    );

    console.log(`   → ${volunteerBindings.length} bindings à synchroniser`);

    // ─── ÉTAPE 3: Pour chaque binding de volunteer, l'appliquer à PROFESSOR ──
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Correction des scopes : remplacer 'assignment' par 'same_establishment'
    const correctVisibilityScope = (
      scope: any,
      interfaceName: string,
    ): any => {
      if (!scope) return null;

      // Menus reports et vsc-reports : forcer same_establishment
      if (
        interfaceName === 'sidebar' &&
        scope.scope === 'assignment'
      ) {
        console.log(`   → Correction scope assignment → same_establishment`);
        return {
          scope: 'same_establishment',
          relations: ['establishment'],
        };
      }

      return scope;
    };

    for (const binding of volunteerBindings) {
      // Corriger le visibility_scope si nécessaire
      const correctedScope = correctVisibilityScope(
        binding.visibility_scope,
        binding.interface_name,
      );

      // Vérifier si PROFESSOR a déjà ce binding
      const existingBinding = await ds.query(
        `SELECT id, visibility_scope, visible, "order"
         FROM role_interface_elements
         WHERE role_id = $1::uuid
         AND element_id = $2::uuid`,
        [professorRole.id, binding.element_id],
      );

      if (existingBinding.length === 0) {
        // INSERT : PROFESSOR n'a pas ce binding
        await ds.query(
          `INSERT INTO role_interface_elements (
            id, company_id, role_id, element_id, 
            visibility_scope, visible, "order",
            created_at, updated_at
          ) VALUES (
            gen_random_uuid(), 
            $1::uuid, 
            $2::uuid, 
            $3::uuid,
            $4::jsonb,
            $5::boolean,
            $6::integer,
            now(),
            now()
          )`,
          [
            companyId,
            professorRole.id,
            binding.element_id,
            correctedScope || null,
            binding.visible,
            binding.order,
          ],
        );
        inserted++;
      } else {
        // UPDATE : vérifier si les valeurs sont différentes
        const existing = existingBinding[0];
        const scopeChanged =
          JSON.stringify(existing.visibility_scope) !==
          JSON.stringify(correctedScope);
        const visibleChanged = existing.visible !== binding.visible;
        const orderChanged = existing.order !== binding.order;

        if (scopeChanged || visibleChanged || orderChanged) {
          await ds.query(
            `UPDATE role_interface_elements
             SET visibility_scope = $1::jsonb,
                 visible = $2::boolean,
                 "order" = $3::integer,
                 updated_at = now()
             WHERE role_id = $4::uuid
             AND element_id = $5::uuid`,
            [
              correctedScope || null,
              binding.visible,
              binding.order,
              professorRole.id,
              binding.element_id,
            ],
          );
          updated++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`   ✓ ${inserted} bindings insérés`);
    console.log(`   ✓ ${updated} bindings mis à jour`);
    console.log(`   ✓ ${skipped} bindings déjà synchronisés`);

    // ─── ÉTAPE 3.5: Corriger aussi les scopes de volunteer ──────────────────
    console.log('\n   → Correction des scopes volunteer (assignment → same_establishment)...');
    
    const volunteerScopeCorrection = await ds.query(
      `UPDATE role_interface_elements
       SET visibility_scope = '{"scope": "same_establishment", "relations": ["establishment"]}'::jsonb,
           updated_at = now()
       FROM interface_elements ie
       WHERE role_interface_elements.role_id = $1::uuid
       AND role_interface_elements.element_id = ie.id
       AND ie.interface_name = 'sidebar'
       AND ie.element_id IN ('menu-reports', 'menu-vsc-reports')
       AND role_interface_elements.visibility_scope->>'scope' = 'assignment'
       RETURNING ie.element_id`,
      [volunteerRole.id],
    );

    if (volunteerScopeCorrection.length > 0) {
      console.log(`   ✓ ${volunteerScopeCorrection.length} scopes volunteer corrigés`);
      for (const row of volunteerScopeCorrection) {
        console.log(`      - ${row.element_id}`);
      }
    } else {
      console.log(`   ✓ Scopes volunteer déjà corrects`);
    }

    // ─── ÉTAPE 4: Supprimer les bindings de PROFESSOR qui n'existent pas chez volunteer ──
    console.log('   → Nettoyage des bindings orphelins...');

    const orphanedBindings = await ds.query(
      `SELECT rie.id, ie.interface_name, ie.element_id
       FROM role_interface_elements rie
       JOIN interface_elements ie ON ie.id = rie.element_id
       WHERE rie.role_id = $1::uuid
       AND rie.element_id NOT IN (
         SELECT rie2.element_id
         FROM role_interface_elements rie2
         WHERE rie2.role_id = $2::uuid
       )
       AND ie.deleted_at IS NULL`,
      [professorRole.id, volunteerRole.id],
    );

    if (orphanedBindings.length > 0) {
      console.log(
        `   ⚠️  ${orphanedBindings.length} bindings orphelins trouvés (PROFESSOR a des accès que volunteer n'a pas)`,
      );
      for (const orphan of orphanedBindings) {
        console.log(
          `      - ${orphan.interface_name} / ${orphan.element_id}`,
        );
      }

      // Option 1: Les supprimer (commenté par défaut pour sécurité)
      // await ds.query(
      //   `DELETE FROM role_interface_elements
      //    WHERE role_id = $1::uuid
      //    AND element_id NOT IN (
      //      SELECT rie2.element_id
      //      FROM role_interface_elements rie2
      //      WHERE rie2.role_id = $2::uuid
      //    )`,
      //   [professorRole.id, volunteerRole.id],
      // );
      // console.log(`   ✓ ${orphanedBindings.length} bindings orphelins supprimés`);
    } else {
      console.log('   ✓ Aucun binding orphelin');
    }

    // ─── ÉTAPE 5: Vérification finale ────────────────────────────────────────
    const volunteerCount = await ds.query(
      `SELECT COUNT(*) as count
       FROM role_interface_elements rie
       JOIN interface_elements ie ON ie.id = rie.element_id
       WHERE rie.role_id = $1::uuid
       AND ie.deleted_at IS NULL`,
      [volunteerRole.id],
    );

    const professorCount = await ds.query(
      `SELECT COUNT(*) as count
       FROM role_interface_elements rie
       JOIN interface_elements ie ON ie.id = rie.element_id
       WHERE rie.role_id = $1::uuid
       AND ie.deleted_at IS NULL`,
      [professorRole.id],
    );

    console.log('\n📊 Vérification finale :');
    console.log(`   volunteer: ${volunteerCount[0].count} bindings`);
    console.log(`   PROFESSOR: ${professorCount[0].count} bindings`);

    if (parseInt(volunteerCount[0].count) <= parseInt(professorCount[0].count)) {
      console.log('   ✅ PROFESSOR a au moins autant de bindings que volunteer');
    } else {
      console.log('   ⚠️  PROFESSOR a moins de bindings que volunteer');
    }

    console.log('\n✅ Alignement PROFESSOR ↔ volunteer terminé avec succès');
  } catch (error) {
    console.error(
      '❌ Erreur lors de l\'alignement PROFESSOR ↔ volunteer:',
      error,
    );
    throw error;
  }
}
