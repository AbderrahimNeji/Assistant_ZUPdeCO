import { DataSource } from 'typeorm';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Seeder pour establishments + rooms + user_establishments + establishment_coordinators
 * 
 * ATTENTION: establishments contient 66 832 lignes!
 * Les données sont insérées par batch de 1000 pour éviter les timeouts
 */

interface Establishment {
  id: string;
  company_id: string;
  uai_code: string;
  name: string;
  [key: string]: any;
}

export async function seedEstablishments(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding establishments (66 832 rows - may take a while)...');

  const dataPath = join(__dirname, 'data', 'establishments.json');
  
  if (!existsSync(dataPath)) {
    console.log('⚠️  establishments.json not found');
    console.log('   Export from Supabase using batches (see EXPORT_REMAINING.sql)');
    return;
  }

  const establishments: Establishment[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  if (establishments.length === 0) {
    console.log('⚠️  No establishments data found');
    return;
  }

  try {
    const BATCH_SIZE = 1000;
    let inserted = 0;

    for (let i = 0; i < establishments.length; i += BATCH_SIZE) {
      const batch = establishments.slice(i, i + BATCH_SIZE);
      
      for (const est of batch) {
        await ds.query(
          `INSERT INTO establishments (
            id, company_id, uai_code, name, official_name, type, status, address_line1, postal_code,
            city, country, latitude, longitude, calendar_type, timezone, contact_name, contact_email,
            contact_phone, student_quota, volunteer_quota, gov_data, created_at, updated_at, deleted_at,
            engagement_start_date, engagement_end_date, contacts, department, managed_by_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
          ON CONFLICT (id) DO NOTHING`,
          [
            est.id, est.company_id, est.uai_code, est.name, est.official_name, est.type, est.status,
            est.address_line1, est.postal_code, est.city, est.country, est.latitude, est.longitude,
            est.calendar_type, est.timezone, est.contact_name, est.contact_email, est.contact_phone,
            est.student_quota, est.volunteer_quota, est.gov_data, est.created_at, est.updated_at,
            est.deleted_at, est.engagement_start_date, est.engagement_end_date, est.contacts,
            est.department, est.managed_by_id,
          ]
        );
      }

      inserted += batch.length;
      console.log(`   Progress: ${inserted} / ${establishments.length} establishments`);
    }

    console.log(`✅ Inserted ${establishments.length} establishments`);
  } catch (error) {
    console.error('❌ Error seeding establishments:', error);
    throw error;
  }

  // Seed rooms
  await seedRooms(ds);
  
  // Seed user_establishments
  await seedUserEstablishments(ds);
  
  // Seed establishment_coordinators
  await seedEstablishmentCoordinators(ds);
}

async function seedRooms(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding rooms...');
  
  const dataPath = join(__dirname, 'data', 'rooms.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  rooms.json not found');
    return;
  }

  const rooms = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const room of rooms) {
    await ds.query(
      `INSERT INTO rooms (
        id, company_id, establishment_id, name, label, capacity, is_available,
        availability_rules, notes, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING`,
      [room.id, room.company_id, room.establishment_id, room.name, room.label, room.capacity,
       room.is_available, room.availability_rules, room.notes, room.created_at, room.updated_at, room.deleted_at]
    );
  }

  console.log(`✅ Inserted ${rooms.length} rooms`);
}

async function seedUserEstablishments(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding user_establishments...');
  
  const dataPath = join(__dirname, 'data', 'user-establishments.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  user-establishments.json not found');
    return;
  }

  const userEstablishments = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const ue of userEstablishments) {
    await ds.query(
      `INSERT INTO user_establishments (
        user_id, establishment_id, company_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, establishment_id) DO NOTHING`,
      [ue.user_id, ue.establishment_id, ue.company_id, ue.created_at, ue.updated_at]
    );
  }

  console.log(`✅ Inserted ${userEstablishments.length} user-establishment relationships`);
}

async function seedEstablishmentCoordinators(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding establishment_coordinators...');
  
  const dataPath = join(__dirname, 'data', 'establishment-coordinators.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  establishment-coordinators.json not found');
    return;
  }

  const coordinators = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const coord of coordinators) {
    await ds.query(
      `INSERT INTO establishment_coordinators (
        establishment_id, coordinator_id, company_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (establishment_id, coordinator_id) DO NOTHING`,
      [coord.establishment_id, coord.coordinator_id, coord.company_id, coord.created_at, coord.updated_at]
    );
  }

  console.log(`✅ Inserted ${coordinators.length} establishment coordinators`);
}
