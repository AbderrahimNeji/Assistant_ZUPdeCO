import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add denormalized name columns to multiple tables for easier querying/display without joins.
 * Includes retroactive population of existing data.
 */
export class AddAllDenormalizedNames1730000000027 implements MigrationInterface {
  name = 'AddAllDenormalizedNames1730000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to session_reports
    await queryRunner.query(`
      ALTER TABLE session_reports
        ADD COLUMN IF NOT EXISTS author_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS session_display_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS validated_by_name VARCHAR(255)
    `);

    // Add columns to vsc_reports
    await queryRunner.query(`
      ALTER TABLE vsc_reports
        ADD COLUMN IF NOT EXISTS student_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS volunteer_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS session_display_name VARCHAR(255)
    `);

    // Add room_name to sessions (other denormalized fields already exist)
    await queryRunner.query(`
      ALTER TABLE sessions
        ADD COLUMN IF NOT EXISTS room_name VARCHAR(255)
    `);

    // Add activity_type_name to activities
    await queryRunner.query(`
      ALTER TABLE activities
        ADD COLUMN IF NOT EXISTS activity_type_name VARCHAR(255)
    `);

    // Add establishment_name to holidays
    await queryRunner.query(`
      ALTER TABLE holidays
        ADD COLUMN IF NOT EXISTS establishment_name VARCHAR(255)
    `);

    // Add profile_label to user_profiles
    await queryRunner.query(`
      ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS profile_label VARCHAR(255)
    `);

    // Add role_label to user_roles
    await queryRunner.query(`
      ALTER TABLE user_roles
        ADD COLUMN IF NOT EXISTS role_label VARCHAR(255)
    `);

    // Populate session_reports with existing data - author_name
    await queryRunner.query(`
      UPDATE session_reports
      SET author_name = COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name))
      FROM users u
      WHERE session_reports.author_id = u.id
        AND session_reports.author_name IS NULL
    `);

    // Populate session_reports with existing data - validated_by_name
    await queryRunner.query(`
      UPDATE session_reports
      SET validated_by_name = COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name))
      FROM users u
      WHERE session_reports.validated_by = u.id
        AND session_reports.validated_by_name IS NULL
    `);

    // Populate session_reports with existing data - session_display_name
    await queryRunner.query(`
      UPDATE session_reports
      SET session_display_name = CONCAT('Séance du ', TO_CHAR(s.session_date, 'DD/MM/YYYY'), ' à ', SUBSTRING(s.start_time::TEXT, 1, 5))
      FROM sessions s
      WHERE session_reports.session_id = s.id
        AND session_reports.session_display_name IS NULL
    `);

    // Populate vsc_reports with existing data - student_name
    await queryRunner.query(`
      UPDATE vsc_reports
      SET student_name = COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name))
      FROM users u
      WHERE vsc_reports.student_id = u.id
        AND vsc_reports.student_name IS NULL
    `);

    // Populate vsc_reports with existing data - volunteer_name
    await queryRunner.query(`
      UPDATE vsc_reports
      SET volunteer_name = COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name))
      FROM users u
      WHERE vsc_reports.volunteer_id = u.id
        AND vsc_reports.volunteer_name IS NULL
    `);

    // Populate vsc_reports with existing data - session_display_name
    await queryRunner.query(`
      UPDATE vsc_reports
      SET session_display_name = CONCAT('Séance du ', TO_CHAR(s.session_date, 'DD/MM/YYYY'), ' à ', SUBSTRING(s.start_time::TEXT, 1, 5))
      FROM sessions s
      WHERE vsc_reports.session_id = s.id
        AND vsc_reports.session_display_name IS NULL
    `);

    // Populate sessions.roomName with existing data
    await queryRunner.query(`
      UPDATE sessions
      SET room_name = r.name
      FROM rooms r
      WHERE sessions.room_id = r.id 
        AND sessions.room_id IS NOT NULL
        AND sessions.room_name IS NULL
    `);

    // Populate activities.activityTypeName with existing data
    await queryRunner.query(`
      UPDATE activities
      SET activity_type_name = at.label
      FROM activity_types at
      WHERE activities.activity_type_id = at.id
        AND activities.activity_type_name IS NULL
    `);

    // Populate holidays.establishmentName with existing data
    await queryRunner.query(`
      UPDATE holidays
      SET establishment_name = e.name
      FROM establishments e
      WHERE holidays.establishment_id = e.id 
        AND holidays.establishment_id IS NOT NULL
        AND holidays.establishment_name IS NULL
    `);

    // Populate user_profiles.profileLabel with existing data
    await queryRunner.query(`
      UPDATE user_profiles
      SET profile_label = p.label
      FROM profiles p
      WHERE user_profiles.profile_id = p.id 
        AND user_profiles.profile_id IS NOT NULL
        AND user_profiles.profile_label IS NULL
    `);

    // Populate user_roles.roleLabel with existing data
    await queryRunner.query(`
      UPDATE user_roles
      SET role_label = r.label
      FROM roles r
      WHERE user_roles.role_id = r.id
        AND user_roles.role_label IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from session_reports
    await queryRunner.query(`
      ALTER TABLE session_reports
        DROP COLUMN IF EXISTS author_name,
        DROP COLUMN IF EXISTS session_display_name,
        DROP COLUMN IF EXISTS validated_by_name
    `);

    // Remove columns from vsc_reports
    await queryRunner.query(`
      ALTER TABLE vsc_reports
        DROP COLUMN IF EXISTS student_name,
        DROP COLUMN IF EXISTS volunteer_name,
        DROP COLUMN IF EXISTS session_display_name
    `);

    // Remove room_name from sessions
    await queryRunner.query(`
      ALTER TABLE sessions
        DROP COLUMN IF EXISTS room_name
    `);

    // Remove activity_type_name from activities
    await queryRunner.query(`
      ALTER TABLE activities
        DROP COLUMN IF EXISTS activity_type_name
    `);

    // Remove establishment_name from holidays
    await queryRunner.query(`
      ALTER TABLE holidays
        DROP COLUMN IF EXISTS establishment_name
    `);

    // Remove profile_label from user_profiles
    await queryRunner.query(`
      ALTER TABLE user_profiles
        DROP COLUMN IF EXISTS profile_label
    `);

    // Remove role_label from user_roles
    await queryRunner.query(`
      ALTER TABLE user_roles
        DROP COLUMN IF EXISTS role_label
    `);
  }
}