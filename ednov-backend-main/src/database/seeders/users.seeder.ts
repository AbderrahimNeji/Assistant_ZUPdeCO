import { DataSource } from 'typeorm';
import * as data from './data/users.json';
import * as rolesData from './data/user-roles.json';
import * as profilesData from './data/user-profiles.json';

export async function seedUsers(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding users with self-ref managed_by...');
  
  const items = Array.isArray(data) ? data : [];
  
  if (items.length === 0) {
    console.log('⚠️  No users with self-ref managed_by data found - please export from Supabase');
    console.log('   Run: SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM users ORDER BY created_at) t');
    return;
  }

  try {
    // Phase 1: Insert users without managed_by
    for (const user of items) {
      const userWithoutManagedBy = { ...user, managed_by: null };
      await ds.query(
        `INSERT INTO users (id, company_id, firebase_uid, email, email_verified, phone, photo_url, display_name, first_name, last_name, status, last_login_at, created_at, updated_at, deleted_at, managed_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO NOTHING`,
        [userWithoutManagedBy.id,
       userWithoutManagedBy.company_id,
       userWithoutManagedBy.firebase_uid,
       userWithoutManagedBy.email,
       userWithoutManagedBy.email_verified,
       userWithoutManagedBy.phone,
       userWithoutManagedBy.photo_url,
       userWithoutManagedBy.display_name,
       userWithoutManagedBy.first_name,
       userWithoutManagedBy.last_name,
       userWithoutManagedBy.status,
       userWithoutManagedBy.last_login_at,
       userWithoutManagedBy.created_at,
       userWithoutManagedBy.updated_at,
       userWithoutManagedBy.deleted_at,
       null]
      );
    }
    
    // Phase 2: Update managed_by for users who have it
    for (const user of items) {
      if (user.managed_by) {
        await ds.query(
          `UPDATE users SET managed_by = $1 WHERE id = $2`,
          [user.managed_by, user.id]
        );
      }
    }

    console.log(`✅ Inserted ${items.length} users with self-ref managed_by`);

    // user_roles
    const roles = Array.isArray(rolesData) ? rolesData : [];
    for (const ur of roles) {
      await ds.query(
        `INSERT INTO user_roles (id, user_id, role_id, created_at, role_label)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [ur.id, ur.user_id, ur.role_id, ur.created_at, ur.role_label ?? null]
      );
    }
    console.log(`✅ Inserted ${roles.length} user_roles`);

    // user_profiles
    const profiles = Array.isArray(profilesData) ? profilesData : [];
    for (const p of profiles) {
      const toJson = (v: any) => (v != null && typeof v === 'object' ? JSON.stringify(v) : v ?? null);
      await ds.query(
        `INSERT INTO user_profiles (
          id, user_id, profile_id, profile_label, subjects, availability, is_minor, guardian_contact,
          created_at, updated_at, vsc_reports_frequencies, tutor_platform_status, date_of_birth,
          gender, address_legacy, level_id, medical_notes, grade_level, address_line1, department,
          postal_code, city, country, engagement_start_date, engagement_end_date, subject_names,
          has_special_needs, school_class_id, special_needs_type, special_needs_note
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
        ) ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.user_id, p.profile_id ?? null, p.profile_label ?? null,
          toJson(p.subjects), toJson(p.availability), p.is_minor ?? null, toJson(p.guardian_contact),
          p.created_at, p.updated_at ?? null, toJson(p.vsc_reports_frequencies), p.tutor_platform_status ?? null,
          p.date_of_birth ?? null, p.gender ?? null, p.address_legacy ?? null, p.level_id ?? null,
          p.medical_notes ?? null, p.grade_level ?? null, p.address_line1 ?? null, p.department ?? null,
          p.postal_code ?? null, p.city ?? null, p.country ?? null, p.engagement_start_date ?? null,
          p.engagement_end_date ?? null, toJson(p.subject_names), p.has_special_needs ?? null,
          p.school_class_id ?? null, p.special_needs_type ?? null, p.special_needs_note ?? null,
        ]
      );
    }
    console.log(`✅ Inserted ${profiles.length} user_profiles`);

  } catch (error) {
    console.error('❌ Error seeding users with self-ref managed_by:', error);
    throw error;
  }
}
