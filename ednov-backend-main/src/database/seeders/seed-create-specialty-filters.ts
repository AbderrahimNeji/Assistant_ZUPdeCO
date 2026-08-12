import { DataSource } from 'typeorm';

/**
 * Seeder pour créer les filtres spécialités et accorder les accès
 * 
 * Crée :
 * 1. establishment-specialties (filter dans interface establishments)
 * 2. filter-specialties (filter dans interface students)
 * 
 * Accorde les accès à coordinator et manager
 * 
 * Idempotent: safe to run multiple times.
 */
export async function seedCreateSpecialtyFilters(ds: DataSource): Promise<void> {
  console.log('🎯 Création des filtres spécialités et accord des accès...\n');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  try {
    // 1. Créer establishment-specialties (filter establishments)
    console.log('Étape 1: Création de establishment-specialties...');
    
    const establishmentFilterResult = await ds.query(
      `
      INSERT INTO interface_elements 
        (id, company_id, interface_name, element_id, element_type, element_label, config, created_at, updated_at)
      VALUES 
        (gen_random_uuid(), $1, 'establishments', 'establishment-specialties', 'filter', 'Specialties', '{}'::jsonb, now(), now())
      ON CONFLICT (company_id, interface_name, element_id) 
      DO UPDATE SET 
        element_label = EXCLUDED.element_label,
        updated_at = now()
      RETURNING id, (xmax = 0) AS inserted
      `,
      [companyId],
    );

    if (establishmentFilterResult.length > 0 && establishmentFilterResult[0].inserted) {
      console.log('  ✓ establishment-specialties créé');
    } else {
      console.log('  ⚠ establishment-specialties déjà existant');
    }

    // 2. Créer filter-specialties (filter students)
    console.log('\nÉtape 2: Création de filter-specialties...');
    
    const studentFilterResult = await ds.query(
      `
      INSERT INTO interface_elements 
        (id, company_id, interface_name, element_id, element_type, element_label, config, created_at, updated_at)
      VALUES 
        (gen_random_uuid(), $1, 'students', 'filter-specialties', 'filter', 'Spécialités', '{}'::jsonb, now(), now())
      ON CONFLICT (company_id, interface_name, element_id) 
      DO UPDATE SET 
        element_label = EXCLUDED.element_label,
        updated_at = now()
      RETURNING id, (xmax = 0) AS inserted
      `,
      [companyId],
    );

    if (studentFilterResult.length > 0 && studentFilterResult[0].inserted) {
      console.log('  ✓ filter-specialties créé');
    } else {
      console.log('  ⚠ filter-specialties déjà existant');
    }

    // 3. Accorder les accès à coordinator et manager pour establishment-specialties
    console.log('\nÉtape 3: Accord des accès pour establishment-specialties...');
    
    const establishmentBindingsResult = await ds.query(
      `
      INSERT INTO role_interface_elements 
        (id, company_id, role_id, element_id, visible, "order", width, visibility_scope, created_at, updated_at)
      SELECT 
        gen_random_uuid(),
        $1::uuid,
        r.id,
        ie.id,
        true,
        0,
        'auto',
        NULL,
        now(),
        now()
      FROM roles r
      CROSS JOIN interface_elements ie
      WHERE r.code IN ('coordinator', 'manager')
        AND r.company_id = $1::uuid
        AND ie.element_id = 'establishment-specialties'
        AND ie.interface_name = 'establishments'
        AND ie.company_id = $1::uuid
        AND NOT EXISTS (
          SELECT 1 FROM role_interface_elements rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
      RETURNING id
      `,
      [companyId],
    );

    console.log(`  ✓ ${establishmentBindingsResult.length} binding(s) créé(s) pour establishment-specialties`);

    // 4. Accorder les accès à coordinator et manager pour filter-specialties
    console.log('\nÉtape 4: Accord des accès pour filter-specialties...');
    
    const studentBindingsResult = await ds.query(
      `
      INSERT INTO role_interface_elements 
        (id, company_id, role_id, element_id, visible, "order", width, visibility_scope, created_at, updated_at)
      SELECT 
        gen_random_uuid(),
        $1::uuid,
        r.id,
        ie.id,
        true,
        0,
        'auto',
        NULL,
        now(),
        now()
      FROM roles r
      CROSS JOIN interface_elements ie
      WHERE r.code IN ('coordinator', 'manager')
        AND r.company_id = $1::uuid
        AND ie.element_id = 'filter-specialties'
        AND ie.interface_name = 'students'
        AND ie.company_id = $1::uuid
        AND NOT EXISTS (
          SELECT 1 FROM role_interface_elements rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
      RETURNING id
      `,
      [companyId],
    );

    console.log(`  ✓ ${studentBindingsResult.length} binding(s) créé(s) pour filter-specialties`);

    // 5. Vérification finale
    console.log('\n\nÉtape 5: Vérification finale...');
    
    const verificationResult = await ds.query(
      `
      SELECT 
        r.code as role_code,
        ie.interface_name,
        ie.element_id,
        rie.visible,
        rie.visibility_scope
      FROM role_interface_elements rie
      JOIN roles r ON rie.role_id = r.id
      JOIN interface_elements ie ON rie.element_id = ie.id
      WHERE r.code IN ('coordinator', 'manager')
        AND r.company_id = $1
        AND ie.element_id IN ('establishment-specialties', 'filter-specialties')
      ORDER BY ie.element_id, r.code
      `,
      [companyId],
    );

    console.log('\n  Résultat :');
    verificationResult.forEach((row) => {
      const status = row.visible ? '✓' : '✗';
      const scope = row.visibility_scope ? ` [scope: ${JSON.stringify(row.visibility_scope)}]` : '';
      console.log(`    ${status} ${row.role_code} → ${row.interface_name}/${row.element_id}${scope}`);
    });

    const totalBindings = 
      establishmentBindingsResult.length + 
      studentBindingsResult.length;

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('✅ Filtres spécialités créés et accès accordés');
    console.log(`   • ${totalBindings} nouveau(x) binding(s) créé(s)`);
    console.log(`   • ${verificationResult.length} binding(s) total`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur lors de la création des filtres spécialités:', error);
    throw error;
  }
}
