import { DataSource } from 'typeorm';
import * as programsData from './data/programs.json';
import * as levelsData from './data/levels.json';
import * as subjectsData from './data/subjects.json';
import * as schoolYearsData from './data/school-years.json';
import * as vacationZonesData from './data/vacation-zones.json';
import * as specialtiesData from './data/specialties.json';
import * as contactFunctionsData from './data/contact-functions.json';
import * as activityTypesData from './data/activity-types.json';
import * as activitiesData from './data/activities.json';
import * as sessionConfigsData from './data/session-configs.json';
import * as holidaysData from './data/holidays.json';

/**
 * Seeder académique global
 * Insère toutes les données académiques (programs, levels, subjects, etc.)
 * ATTENTION: holidays dépend d'establishments et sera seedé après dans run-all
 */
export async function seedAcademic(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding academic data...');

  // 1. Programs
  const programs = Array.isArray(programsData) ? programsData : [];
  for (const program of programs) {
    await ds.query(
      `INSERT INTO programs (
        id, company_id, code, name, description, start_date, end_date, status, rules, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING`,
      [program.id, program.company_id, program.code, program.name, program.description,
       program.start_date, program.end_date, program.status, program.rules,
       program.created_at, program.updated_at, program.deleted_at]
    );
  }
  console.log(`✅ Inserted ${programs.length} programs`);

  // 2. Levels
  const levels = Array.isArray(levelsData) ? levelsData : [];
  for (const level of levels) {
    await ds.query(
      `INSERT INTO levels (
        id, company_id, code, label, education_cycle, min_age, max_age, order_index, status, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING`,
      [level.id, level.company_id, level.code, level.label, level.education_cycle,
       level.min_age, level.max_age, level.order_index, level.status,
       level.created_at, level.updated_at, level.deleted_at]
    );
  }
  console.log(`✅ Inserted ${levels.length} levels`);

  // 3. Subjects
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];
  for (const subject of subjects) {
    await ds.query(
      `INSERT INTO subjects (
        id, company_id, code, label, description, education_cycle, is_core, status, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING`,
      [subject.id, subject.company_id, subject.code, subject.label, subject.description,
       subject.education_cycle, subject.is_core, subject.status,
       subject.created_at, subject.updated_at, subject.deleted_at]
    );
  }
  console.log(`✅ Inserted ${subjects.length} subjects`);

  // 4. School Years
  const schoolYears = Array.isArray(schoolYearsData) ? schoolYearsData : [];
  for (const sy of schoolYears) {
    await ds.query(
      `INSERT INTO school_years (
        id, company_id, code, start_date, end_date, is_current, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING`,
      [sy.id, sy.company_id, sy.code, sy.start_date, sy.end_date,
       sy.is_current, sy.status, sy.created_at, sy.updated_at]
    );
  }
  console.log(`✅ Inserted ${schoolYears.length} school years`);

  // 5. Vacation Zones
  const vacationZones = Array.isArray(vacationZonesData) ? vacationZonesData : [];
  for (const vz of vacationZones) {
    await ds.query(
      `INSERT INTO vacation_zones (
        id, company_id, code, name, description, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING`,
      [vz.id, vz.company_id, vz.code, vz.name, vz.description,
       vz.created_at, vz.updated_at, vz.deleted_at]
    );
  }
  console.log(`✅ Inserted ${vacationZones.length} vacation zones`);

  // 6. Specialties
  const specialties = Array.isArray(specialtiesData) ? specialtiesData : [];
  for (const sp of specialties) {
    await ds.query(
      `INSERT INTO specialties (
        id, code, label, sort_order, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING`,
      [sp.id, sp.code, sp.label, sp.sort_order, sp.is_active,
       sp.created_at, sp.updated_at]
    );
  }
  console.log(`✅ Inserted ${specialties.length} specialties`);

  // 7. Contact Functions
  const contactFunctions = Array.isArray(contactFunctionsData) ? contactFunctionsData : [];
  for (const cf of contactFunctions) {
    await ds.query(
      `INSERT INTO contact_functions (
        id, company_id, label, is_default, usage_count, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING`,
      [cf.id, cf.company_id, cf.label, cf.is_default, cf.usage_count,
       cf.created_at, cf.updated_at, cf.deleted_at]
    );
  }
  console.log(`✅ Inserted ${contactFunctions.length} contact functions`);

  // 8. Activity Types
  const activityTypes = Array.isArray(activityTypesData) ? activityTypesData : [];
  for (const at of activityTypes) {
    await ds.query(
      `INSERT INTO activity_types (
        id, company_id, code, label, description, order_index, status, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [at.id, at.company_id, at.code, at.label, at.description,
       at.order_index, at.status, at.created_at, at.updated_at, at.deleted_at]
    );
  }
  console.log(`✅ Inserted ${activityTypes.length} activity types`);

  // 9. Activities
  const activities = Array.isArray(activitiesData) ? activitiesData : [];
  for (const activity of activities) {
    await ds.query(
      `INSERT INTO activities (
        id, company_id, activity_type_id, code, label, description, can_has_cr, bot, with_link, chat,
        max_tutors, max_students, max_volunteers, order_index, status, created_at, updated_at, deleted_at, max_students_per_tutor
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO NOTHING`,
      [activity.id, activity.company_id, activity.activity_type_id, activity.code, activity.label,
       activity.description, activity.can_has_cr, activity.bot, activity.with_link, activity.chat,
       activity.max_tutors, activity.max_students, activity.max_volunteers, activity.order_index,
       activity.status, activity.created_at, activity.updated_at, activity.deleted_at, activity.max_students_per_tutor]
    );
  }
  console.log(`✅ Inserted ${activities.length} activities`);

  // 10. Session Configs
  const sessionConfigs = Array.isArray(sessionConfigsData) ? sessionConfigsData : [];
  for (const sc of sessionConfigs) {
    await ds.query(
      `INSERT INTO session_configs (
        id, company_id, default_duration_minutes, max_students_per_session, max_volunteers_per_session,
        allow_recurring, allow_ab_calendar, allow_overbooking, report_deadline_hours, auto_close_after_days,
        matching_strategy, settings, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING`,
      [sc.id, sc.company_id, sc.default_duration_minutes, sc.max_students_per_session,
       sc.max_volunteers_per_session, sc.allow_recurring, sc.allow_ab_calendar, sc.allow_overbooking,
       sc.report_deadline_hours, sc.auto_close_after_days, sc.matching_strategy, sc.settings,
       sc.created_at, sc.updated_at]
    );
  }
  console.log(`✅ Inserted ${sessionConfigs.length} session configs`);

  console.log('✅ Academic data seeding completed!');
}

/**
 * Seeder pour holidays - DOIT ÊTRE APPELÉ APRÈS seedEstablishments
 * Car certains holidays ont establishment_id
 */
export async function seedHolidays(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding holidays...');

  const holidays = Array.isArray(holidaysData) ? holidaysData : [];
  let inserted = 0;
  let skipped = 0;
  for (const holiday of holidays) {
    try {
      await ds.query(
        `INSERT INTO holidays (
          id, company_id, name, description, start_date, end_date, type, establishment_id,
          is_recurring_yearly, created_at, updated_at, deleted_at, vacation_zone_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING`,
        [holiday.id, holiday.company_id, holiday.name, holiday.description, holiday.start_date,
         holiday.end_date, holiday.type, holiday.establishment_id, holiday.is_recurring_yearly,
         holiday.created_at, holiday.updated_at, holiday.deleted_at, holiday.vacation_zone_id]
      );
      inserted++;
    } catch (err: any) {
      if (err?.code === '23503' && err?.constraint?.includes('establishment')) {
        skipped++;
      } else {
        throw err;
      }
    }
  }
  if (skipped > 0) {
    console.warn(`⚠️  ${skipped} holidays ignorés (establishment non migré — relancer seed:migrate-establishments puis seed:holidays)`);
  }
  console.log(`✅ Inserted ${inserted} holidays (${skipped} skipped - establishment FK)`);
}
