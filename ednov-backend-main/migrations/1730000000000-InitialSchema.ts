import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Single source of truth: this migration runs sql/full-schema.sql.
 * So "npm run migration:run" produces the same schema as the reference SQL file.
 * Do not mix: use either migrations for all envs, or manual "psql -f sql/full-schema.sql" for new DBs (see sql/README.md).
 */
function loadAndSplitFullSchema(): string[] {
  const sqlPath = path.join(process.cwd(), 'sql', 'full-schema.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`full-schema.sql not found at ${sqlPath}. Run from project root.`);
  }
  const content = fs.readFileSync(sqlPath, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/^--[^\n]*/gm, '')
    .trim();
  const statements: string[] = [];
  let buf = '';
  let i = 0;
  while (i < content.length) {
    if (content.substring(i, i + 2) === '$$') {
      const end = content.indexOf('$$', i + 2);
      if (end === -1) throw new Error('Unmatched $$ in full-schema.sql');
      buf += content.slice(i, end + 2);
      i = end + 2;
      continue;
    }
    if (content[i] === ';' && /^\s*\n/.test(content.slice(i + 1))) {
      const st = buf.trim();
      if (st.length > 0) statements.push(st);
      buf = '';
      i++;
      while (content[i] === '\n' || content[i] === ' ') i++;
      continue;
    }
    buf += content[i];
    i++;
  }
  const last = buf.trim();
  if (last.length > 0) statements.push(last);
  return statements;
}

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const statements = loadAndSplitFullSchema();
    for (const st of statements) {
      await queryRunner.query(st);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const triggerOnTable: [string, string][] = [
      ['tr_companies_updated_at', 'companies'], ['tr_establishments_updated_at', 'establishments'],
      ['tr_rooms_updated_at', 'rooms'], ['tr_users_updated_at', 'users'], ['tr_roles_updated_at', 'roles'], ['tr_profiles_updated_at', 'profiles'],
      ['tr_user_profiles_updated_at', 'user_profiles'], ['tr_programs_updated_at', 'programs'],
      ['tr_levels_updated_at', 'levels'], ['tr_subjects_updated_at', 'subjects'],
      ['tr_school_years_updated_at', 'school_years'],
      ['tr_vacation_zones_updated_at', 'vacation_zones'],
      ['tr_holidays_updated_at', 'holidays'],
      ['tr_session_configs_updated_at', 'session_configs'], ['tr_sessions_updated_at', 'sessions'],
      ['tr_assignments_updated_at', 'assignments'], ['tr_session_reports_updated_at', 'session_reports'],
      ['tr_vsc_reports_updated_at', 'vsc_reports'], ['tr_company_settings_updated_at', 'company_settings'],
      ['tr_feature_flags_updated_at', 'feature_flags'], ['tr_brandings_updated_at', 'brandings'],
      ['tr_themes_updated_at', 'themes'], ['tr_media_assets_updated_at', 'media_assets'],
      ['tr_email_templates_updated_at', 'email_templates'], ['tr_document_templates_updated_at', 'document_templates'],
      ['tr_ui_configurations_updated_at', 'ui_configurations'],
    ];
    const tables = [
      'idempotency_keys', 'processed_events', 'outbox_events', 'audit_logs', 'ui_configurations',
      'document_templates', 'email_templates', 'media_assets', 'themes', 'branding_histories', 'brandings',
      'feature_flags', 'company_settings', 'vsc_reports', 'session_reports', 'assignments',
      'session_participants', 'sessions', 'session_configs', 'holidays', 'vacation_zones', 'school_years', 'subjects',
      'levels', 'programs', 'user_profiles', 'profiles', 'user_roles', 'roles', 'users',
      'rooms', 'establishments', 'companies',
    ];
    for (const [tr, table] of triggerOnTable) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS ${tr} ON ${table}`);
    }
    await queryRunner.query('DROP FUNCTION IF EXISTS set_updated_at()');
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
  }
}
