/**
 * Script pour exporter TOUTES les données de la BD Supabase vers des fichiers JSON
 * Utilise MCP Supabase pour éviter d'avoir à configurer une connexion directe
 * Run: ts-node src/database/seeders/export-all-data.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';

// NOTE: Ce script doit être exécuté manuellement via les appels MCP
// Il sert de documentation pour l'export des données

const TABLES_TO_EXPORT = [
  { name: 'companies', filename: 'companies.json' },
  { name: 'roles', filename: 'roles.json' },
  { name: 'interface_elements', filename: 'interface-elements.json' },
  { name: 'role_interface_elements', filename: 'role-interface-elements.json' },
  { name: 'brandings', filename: 'brandings.json' },
  { name: 'programs', filename: 'programs.json' },
  { name: 'levels', filename: 'levels.json' },
  { name: 'subjects', filename: 'subjects.json' },
  { name: 'school_years', filename: 'school-years.json' },
  { name: 'vacation_zones', filename: 'vacation-zones.json' },
  { name: 'holidays', filename: 'holidays.json' },
  { name: 'specialties', filename: 'specialties.json' },
  { name: 'contact_functions', filename: 'contact-functions.json' },
  { name: 'activity_types', filename: 'activity-types.json' },
  { name: 'activities', filename: 'activities.json' },
  { name: 'session_configs', filename: 'session-configs.json' },
  { name: 'users', filename: 'users.json' },
  { name: 'user_profiles', filename: 'user-profiles.json' },
  { name: 'user_roles', filename: 'user-roles.json' },
  { name: 'establishments', filename: 'establishments.json' },
  { name: 'rooms', filename: 'rooms.json' },
  { name: 'user_establishments', filename: 'user-establishments.json' },
  { name: 'establishment_coordinators', filename: 'establishment-coordinators.json' },
  { name: 'sessions', filename: 'sessions.json' },
  { name: 'session_participants', filename: 'session-participants.json' },
  { name: 'session_reports', filename: 'session-reports.json' },
  { name: 'session_student_tutor_pairs', filename: 'session-student-tutor-pairs.json' },
  { name: 'session_status_history', filename: 'session-status-history.json' },
  { name: 'vsc_reports', filename: 'vsc-reports.json' },
  { name: 'tutor_criminal_records', filename: 'tutor-criminal-records.json' },
  { name: 'core_pairs', filename: 'core-pairs.json' },
  { name: 'post_its', filename: 'post-its.json' },
  { name: 'post_it_shares', filename: 'post-it-shares.json' },
  { name: 'user_interface_preferences', filename: 'user-interface-preferences.json' },
];

console.log(`
Pour exporter les données, exécuter ces requêtes MCP Supabase:

${TABLES_TO_EXPORT.map(t => `
-- ${t.name}
SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM ${t.name} ORDER BY created_at) t
`).join('\n')}
`);

export function saveTableData(tableName: string, data: any[]) {
  const table = TABLES_TO_EXPORT.find(t => t.name === tableName);
  if (!table) {
    throw new Error(`Table ${tableName} not found in export config`);
  }
  
  const filepath = join(__dirname, 'data', table.filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Exported ${data.length} rows to ${table.filename}`);
}
