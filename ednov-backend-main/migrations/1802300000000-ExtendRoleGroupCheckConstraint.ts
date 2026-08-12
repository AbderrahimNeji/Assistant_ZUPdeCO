import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the chk_roles_role_group CHECK constraint on the roles table to include
 * the new role group codes: 'admins', 'service_users', 'tutors', 'volunteers', 'students'.
 *
 * Also drops the redundant 'roles_role_group_check' constraint that was auto-generated
 * by TypeORM/Postgres and conflicted with the named constraint.
 *
 * Previous allowed values: super_admin, steering, operations, service_user, other
 * New allowed values:      super_admin, admins, steering, operations, service_user,
 *                          service_users, tutors, volunteers, students, other
 */

const OLD_ROLE_GROUP_VALUES = `'super_admin', 'steering', 'operations', 'service_user', 'other'`;
const NEW_ROLE_GROUP_VALUES = `'admins', 'super_admin', 'steering', 'operations', 'service_user', 'service_users', 'tutors', 'volunteers', 'students', 'other'`;

export class ExtendRoleGroupCheckConstraint1802300000000 implements MigrationInterface {
  name = 'ExtendRoleGroupCheckConstraint1802300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the auto-generated redundant constraint (from TypeORM / earlier migration runs)
    await queryRunner.query(`
      ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_group_check;
    `);

    // Drop the existing named constraint so we can recreate it with extended values
    await queryRunner.query(`
      ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_role_group;
    `);

    // Recreate with all new group codes included
    await queryRunner.query(`
      ALTER TABLE roles
        ADD CONSTRAINT chk_roles_role_group
        CHECK (role_group::text = ANY(ARRAY[${NEW_ROLE_GROUP_VALUES}]::text[]));
    `);

    // Update the column comment to reflect the new groups
    await queryRunner.query(`
      COMMENT ON COLUMN roles.role_group IS
        'admins (admin), steering (coordinator, manager), operations, service_user (legacy tutor), service_users, tutors (tutor), volunteers (volunteer), students (student), other (custom)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the extended constraint
    await queryRunner.query(`
      ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_role_group;
    `);

    // Restore original constraint (old values only)
    await queryRunner.query(`
      ALTER TABLE roles
        ADD CONSTRAINT chk_roles_role_group
        CHECK (role_group IN (${OLD_ROLE_GROUP_VALUES}));
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN roles.role_group IS
        'super_admin (admin), steering (coordinator, manager), operations (volunteer), service_user (tutor), other (student, custom)';
    `);
  }
}
