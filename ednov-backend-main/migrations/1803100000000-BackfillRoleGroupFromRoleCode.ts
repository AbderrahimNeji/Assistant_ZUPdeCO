import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the `role_group` column on the `roles` table based on the role `code`.
 *
 * Previous (legacy) values were generic group names (operations, service_user, steering, super_admin)
 * that didn't match the new canonical mapping used by `getRoleCodesByGroup`.
 *
 * New canonical mapping (from role-groups.ts KNOWN_CODE_TO_GROUP):
 *   admin, coordinator, manager → admins
 *   volunteer                  → volunteers
 *   tutor, professor            → tutors
 *   student                    → students
 *   (anything else)             → kept as-is / other
 */
export class BackfillRoleGroupFromRoleCode1803100000000 implements MigrationInterface {
  name = 'BackfillRoleGroupFromRoleCode1803100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE roles
      SET role_group = CASE LOWER(code)
        WHEN 'admin'       THEN 'admins'
        WHEN 'coordinator' THEN 'admins'
        WHEN 'manager'     THEN 'admins'
        WHEN 'volunteer'   THEN 'volunteers'
        WHEN 'tutor'       THEN 'tutors'
        WHEN 'professor'   THEN 'tutors'
        WHEN 'student'     THEN 'students'
        ELSE role_group
      END
      WHERE LOWER(code) IN ('admin', 'coordinator', 'manager', 'volunteer', 'tutor', 'professor', 'student')
        AND deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore legacy values
    await queryRunner.query(`
      UPDATE roles
      SET role_group = CASE LOWER(code)
        WHEN 'admin'       THEN 'super_admin'
        WHEN 'coordinator' THEN 'steering'
        WHEN 'manager'     THEN 'steering'
        WHEN 'volunteer'   THEN 'operations'
        WHEN 'tutor'       THEN 'service_user'
        WHEN 'professor'   THEN 'operations'
        WHEN 'student'     THEN 'other'
        ELSE role_group
      END
      WHERE LOWER(code) IN ('admin', 'coordinator', 'manager', 'volunteer', 'tutor', 'professor', 'student')
        AND deleted_at IS NULL;
    `);
  }
}
