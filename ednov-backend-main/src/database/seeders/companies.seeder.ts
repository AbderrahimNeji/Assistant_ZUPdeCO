import { DataSource } from 'typeorm';
import * as data from './data/companies.json';

/**
 * Seeder pour la table companies
 * Insère les 3 companies de la BD source
 */
export async function seedCompanies(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding companies...');
  
  const companies = Array.isArray(data) ? data : [];
  
  if (companies.length === 0) {
    console.log('⚠️  No companies data found');
    return;
  }

  try {
    // Insert avec ON CONFLICT pour idempotence
    for (const company of companies) {
      await ds.query(
        `INSERT INTO companies (
          id, code, name, legal_name, description, contract_type, 
          contract_start_date, contract_end_date, logo_url, primary_color, 
          secondary_color, domain, timezone, status, settings, 
          created_at, updated_at, deleted_at, country
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          company.id,
          company.code,
          company.name,
          company.legal_name,
          company.description,
          company.contract_type,
          company.contract_start_date,
          company.contract_end_date,
          company.logo_url,
          company.primary_color,
          company.secondary_color,
          company.domain,
          company.timezone,
          company.status,
          company.settings,
          company.created_at,
          company.updated_at,
          company.deleted_at,
          company.country,
        ]
      );
    }

    console.log(`✅ Inserted ${companies.length} companies`);
  } catch (error) {
    console.error('❌ Error seeding companies:', error);
    throw error;
  }
}
