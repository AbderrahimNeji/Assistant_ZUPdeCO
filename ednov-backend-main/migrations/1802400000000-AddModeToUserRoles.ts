import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeToUserRoles1802400000000 implements MigrationInterface {
  name = 'AddModeToUserRoles1802400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.user_roles
      ADD COLUMN IF NOT EXISTS mode varchar(20) NULL;

      COMMENT ON COLUMN public.user_roles.mode IS
        'in_person | remote | hybrid — null = inherit from role';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.user_roles
      DROP COLUMN IF EXISTS mode;
    `);
  }
}
