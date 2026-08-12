import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Évolution complète de `users.status` (fusion des anciennes migrations 177700 + 177705 + 180010).
 *
 * up() enchaîne dans l’ordre :
 * 1) Modèle élève registered | accompanied | deactivated + non-élèves registered (ancien 177700)
 * 2) Restauration staff active | suspended + CHECK élargie (ancien 177705)
 * 3) suspended → deactivated pour tous + CHECK finale sans suspended (ancien 180010)
 *
 * Bases déjà migrées : si la table `migrations` contient encore les lignes
 * `RestoreStaffUserStatuses1777050000000` ou `UsersStatusDropSuspended1800100000000`,
 * supprimer ces entrées après vérification du schéma (sinon TypeORM signale des migrations orphelines).
 * Ne pas re-exécuter ce `up` sur une base déjà à jour : un seul passage historique par environnement.
 *
 * Réf. urgence sans DML complet : docs/users-status-migration-runbook.md (si présent).
 */
export class UpdateUsersStatusCheckToRegisteredModel1777000000000 implements MigrationInterface {
  name = 'UpdateUsersStatusCheckToRegisteredModel1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Step 1: Drop existing constraint ───
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_status_check"`);

    // ─── Step 2: Update STUDENTS with active status based on session attendance ───
    await queryRunner.query(`
      UPDATE users u
      SET status = CASE
        WHEN (
          SELECT COUNT(*)::int
          FROM session_participants sp
          WHERE sp.user_id = u.id
            AND sp.role = 'student'
            AND sp.attendance_status = 'present'
        ) >= 3
        THEN 'accompanied'
        ELSE 'registered'
      END
      WHERE u.deleted_at IS NULL
        AND u.status = 'active'
        AND u.id IN (
          SELECT ur.user_id
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id AND UPPER(r.code) = 'STUDENT'
        )
    `);

    // ─── Step 3: Update STUDENTS with suspended status → deactivated ───
    await queryRunner.query(`
      UPDATE users u
      SET status = 'deactivated'
      WHERE u.deleted_at IS NULL
        AND u.status = 'suspended'
        AND u.id IN (
          SELECT ur.user_id
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id AND UPPER(r.code) = 'STUDENT'
        )
    `);

    // ─── Step 4: Update NON-STUDENTS ───
    // suspended → deactivated (active and deactivated unchanged)
    await queryRunner.query(`
      UPDATE users u
      SET status = 'deactivated'
      WHERE u.deleted_at IS NULL
        AND u.status = 'suspended'
        AND u.id NOT IN (
          SELECT ur.user_id
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id AND UPPER(r.code) = 'STUDENT'
        )
    `);

    // ─── Step 5: Set default and add constraint ───
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active'`);

    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "users_status_check"
      CHECK (status IN ('registered', 'accompanied', 'deactivated', 'active'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Step 1: Drop constraint ───
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_status_check"`);

    // ─── Step 2: Reverse non-students: deactivated → suspended ───
    await queryRunner.query(`
      UPDATE users u
      SET status = 'suspended'
      WHERE u.deleted_at IS NULL
        AND u.status = 'deactivated'
        AND u.id NOT IN (
          SELECT ur.user_id
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id AND UPPER(r.code) = 'STUDENT'
        )
    `);

    // ─── Step 3: Reverse students: deactivated → suspended ───
    await queryRunner.query(`
      UPDATE users u
      SET status = 'suspended'
      WHERE u.deleted_at IS NULL
        AND u.status = 'deactivated'
        AND u.id IN (
          SELECT ur.user_id
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id AND UPPER(r.code) = 'STUDENT'
        )
    `);

    // ─── Step 4: Reverse students: registered/accompanied → active ───
    await queryRunner.query(`
      UPDATE users
      SET status = 'active'
      WHERE deleted_at IS NULL
        AND status IN ('registered', 'accompanied')
    `);

    // ─── Step 5: Restore defaults and constraints ───
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active'`);

    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "users_status_check"
      CHECK (status IN ('active', 'suspended'))
    `);
  }
}