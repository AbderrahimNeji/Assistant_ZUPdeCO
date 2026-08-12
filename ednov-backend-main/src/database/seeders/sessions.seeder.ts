import { DataSource } from 'typeorm';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Seeder pour sessions + toutes les tables liées:
 * - sessions
 * - session_participants
 * - session_reports
 * - session_student_tutor_pairs
 * - session_status_history
 * - vsc_reports
 * - tutor_criminal_records
 */

export async function seedSessions(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding sessions...');
  
  const dataPath = join(__dirname, 'data', 'sessions.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  sessions.json not found');
    return;
  }

  const sessions = JSON.parse(readFileSync(dataPath, 'utf-8'));
  let inserted = 0;
  let skipped = 0;

  for (const session of sessions) {
    try {
      await ds.query(
        `INSERT INTO sessions (
          id, company_id, establishment_id, room_id, program_id, school_year_id, session_date,
          start_time, end_time, type, mode, recurrence_type, recurrence_rule, max_students,
          internal_notes, status, managed_by, version, created_at, updated_at, deleted_at,
          activity_id, max_volunteers, topic, duration_minutes, recurrence_group_id,
          created_by, updated_by, session_format, join_link, subject_ids, level_ids, plan_during_holidays
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          session.id, session.company_id, session.establishment_id, session.room_id, session.program_id,
          session.school_year_id, session.session_date, session.start_time, session.end_time, session.type,
          session.mode, session.recurrence_type, session.recurrence_rule, session.max_students,
          session.internal_notes, session.status, session.managed_by, session.version, session.created_at,
          session.updated_at, session.deleted_at, session.activity_id, session.max_volunteers, session.topic,
          session.duration_minutes, session.recurrence_group_id, session.created_by, session.updated_by,
          session.session_format, session.join_link,
          session.subject_ids != null ? JSON.stringify(session.subject_ids) : null,
          session.level_ids != null ? JSON.stringify(session.level_ids) : null,
          session.plan_during_holidays,
        ]
      );
      inserted++;
    } catch (err: any) {
      if (err?.code === '23503') {
        skipped++;
      } else {
        throw err;
      }
    }
  }

  if (skipped > 0) {
    console.warn(`⚠️  ${skipped}/${sessions.length} sessions ignorées (establishment_id FK manquante — migrez les établissements d'abord avec: npm run seed:migrate-establishments)`);
  }
  console.log(`✅ Inserted ${inserted} sessions (${skipped} skipped)`);

  if (inserted === 0 && skipped > 0) {
    console.warn('⚠️  Aucune session insérée → sous-tables sessions ignorées (participants, reports, etc.)');
    console.warn('   Relancez seed:all après seed:migrate-establishments pour compléter.');
    return;
  }

  // Seed related tables
  await seedSessionParticipants(ds);
  await seedSessionReports(ds);
  await seedSessionStudentTutorPairs(ds);
  await seedSessionStatusHistory(ds);
  await seedVscReports(ds);
  await seedTutorCriminalRecords(ds);
}

async function seedSessionParticipants(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding session_participants...');
  
  const dataPath = join(__dirname, 'data', 'session-participants.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  session-participants.json not found');
    return;
  }

  const participants = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const p of participants) {
    try {
      await ds.query(
        `INSERT INTO session_participants (
          session_id, user_id, role, attendance_status, absence_justification,
          notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (session_id, user_id) DO NOTHING`,
        [
          p.session_id, p.user_id,
          p.role ?? p.role_type,
          p.attendance_status ?? p.presence_status ?? 'pending',
          p.absence_justification,
          p.notes,
          p.created_at,
        ]
      );
    } catch (err: any) {
      if (err?.code === '23503') {
        // session_id FK manquante — skip silencieux
      } else {
        throw err;
      }
    }
  }

  console.log(`✅ Inserted ${participants.length} session participants`);
}

async function seedSessionReports(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding session_reports...');
  
  const dataPath = join(__dirname, 'data', 'session-reports.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  session-reports.json not found');
    return;
  }

  const reports = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const r of reports) {
    await ds.query(
      `INSERT INTO session_reports (
        id, session_id, company_id, author_id, report_type, status, content, objectives,
        difficulties, positive_points, next_steps, attachments, validated_by, validated_at,
        created_at, updated_at, generated_resources, script
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO NOTHING`,
      [r.id, r.session_id, r.company_id, r.author_id, r.report_type, r.status, r.content,
       r.objectives, r.difficulties, r.positive_points, r.next_steps, r.attachments,
       r.validated_by, r.validated_at, r.created_at, r.updated_at, r.generated_resources, r.script]
    );
  }

  console.log(`✅ Inserted ${reports.length} session reports`);
}

async function seedSessionStudentTutorPairs(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding session_student_tutor_pairs...');
  
  const dataPath = join(__dirname, 'data', 'session-student-tutor-pairs.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  session-student-tutor-pairs.json not found');
    return;
  }

  const pairs = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const pair of pairs) {
    try {
      await ds.query(
        `INSERT INTO session_student_tutor_pairs (
          session_id, session_type, student_user_id, tutor_user_id, assignment_source
        )
        SELECT $1, s.type, $2, $3, $4
        FROM sessions s
        WHERE s.id = $1`,
        [pair.session_id, pair.student_user_id, pair.tutor_user_id, pair.assignment_source ?? 'manual'],
      );
    } catch (err: any) {
      if (err?.code === '23503') { /* FK manquante — skip */ } else { throw err; }
    }
  }

  console.log(`✅ Inserted ${pairs.length} session student-tutor pairs`);
}

async function seedSessionStatusHistory(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding session_status_history...');
  
  const dataPath = join(__dirname, 'data', 'session-status-history.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  session-status-history.json not found');
    return;
  }

  const history = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const h of history) {
    await ds.query(
      `INSERT INTO session_status_history (
        id, session_id, old_status, new_status, actor_id, reason, metadata,
        created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [h.id, h.session_id, h.old_status, h.new_status, h.actor_id, h.reason, h.metadata,
       h.created_at, h.updated_at, h.deleted_at]
    );
  }

  console.log(`✅ Inserted ${history.length} session status history entries`);
}

async function seedVscReports(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding vsc_reports...');
  
  const dataPath = join(__dirname, 'data', 'vsc-reports.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  vsc-reports.json not found');
    return;
  }

  const reports = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const r of reports) {
    await ds.query(
      `INSERT INTO vsc_reports (
        id, company_id, establishment_id, session_id, vsc_id, student_id, volunteer_id,
        report_date, report_category, content, actions_taken, follow_up_needed,
        follow_up_date, status, validated_by, validated_at, created_at, updated_at,
        filter_search
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO NOTHING`,
      [r.id, r.company_id, r.establishment_id, r.session_id, r.vsc_id, r.student_id,
       r.volunteer_id, r.report_date, r.report_category, r.content, r.actions_taken,
       r.follow_up_needed, r.follow_up_date, r.status, r.validated_by, r.validated_at,
       r.created_at, r.updated_at, r.filter_search]
    );
  }

  console.log(`✅ Inserted ${reports.length} VSC reports`);
}

async function seedTutorCriminalRecords(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding tutor_criminal_records...');
  
  const dataPath = join(__dirname, 'data', 'tutor-criminal-records.json');
  if (!existsSync(dataPath)) {
    console.log('⚠️  tutor-criminal-records.json not found');
    return;
  }

  const records = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  for (const r of records) {
    await ds.query(
      `INSERT INTO tutor_criminal_records (
        id, company_id, user_id, record_type, issue_date, expiry_date, document_url,
        validation_status, validated_by_user_id, validated_at, created_at, updated_at, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING`,
      [r.id, r.company_id, r.user_id, r.record_type, r.issue_date, r.expiry_date,
       r.document_url, r.validation_status, r.validated_by_user_id, r.validated_at,
       r.created_at, r.updated_at, r.notes]
    );
  }

  console.log(`✅ Inserted ${records.length} tutor criminal records`);
}
