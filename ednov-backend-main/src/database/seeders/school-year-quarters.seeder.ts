import { DataSource } from 'typeorm';

/**
 * Seeder pour créer automatiquement les trimestres pour toutes les années scolaires existantes
 * 
 * Logique des trimestres :
 * - T1 : 1er octobre → 31 décembre
 * - T2 : 1er janvier → 31 mars
 * - T3 : 1er avril → 30 juin
 * 
 * L'année utilisée est celle de school_year.start_date
 */
export async function seedSchoolYearQuarters(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding school year quarters...');

  // Récupérer toutes les années scolaires existantes
  const schoolYears = await ds.query(`
    SELECT id, company_id, start_date, code
    FROM school_years
    ORDER BY start_date
  `);

  console.log(`Found ${schoolYears.length} school years`);

  let inserted = 0;
  let skipped = 0;

  for (const schoolYear of schoolYears) {
    const startYear = new Date(schoolYear.start_date).getFullYear();
    
    // T1 : 1er octobre → 31 décembre
    const t1StartDate = `${startYear}-10-01`;
    const t1EndDate = `${startYear}-12-31`;

    // T2 : 1er janvier → 31 mars (année suivante)
    const t2StartDate = `${startYear + 1}-01-01`;
    const t2EndDate = `${startYear + 1}-03-31`;

    // T3 : 1er avril → 30 juin (année suivante)
    const t3StartDate = `${startYear + 1}-04-01`;
    const t3EndDate = `${startYear + 1}-06-30`;

    const quarters = [
      { number: 1, startDate: t1StartDate, endDate: t1EndDate },
      { number: 2, startDate: t2StartDate, endDate: t2EndDate },
      { number: 3, startDate: t3StartDate, endDate: t3EndDate },
    ];

    for (const quarter of quarters) {
      try {
        await ds.query(
          `INSERT INTO school_year_quarters (
            school_year_id, company_id, number, start_date, end_date
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (school_year_id, number) DO NOTHING`,
          [
            schoolYear.id,
            schoolYear.company_id,
            quarter.number,
            quarter.startDate,
            quarter.endDate,
          ]
        );
        inserted++;
      } catch (err: any) {
        console.error(`❌ Error inserting quarter ${quarter.number} for school year ${schoolYear.code}:`, err.message);
        skipped++;
      }
    }

    console.log(`✅ Created quarters for school year ${schoolYear.code}`);
  }

  console.log(`✅ Inserted ${inserted} quarters (${skipped} skipped due to conflicts)`);
  console.log('✅ School year quarters seeding completed!');
}
