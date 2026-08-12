import { MigrationInterface, QueryRunner } from 'typeorm';

export class PresenceModelRemoveCanColumns1744600000000 implements MigrationInterface {
  name = 'PresenceModelRemoveCanColumns1744600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Modèle "présence = accès" : supprimer les colonnes can_view, can_edit, can_customize
    // La simple présence d'une row dans role_interface_elements signifie que le rôle a accès
    await queryRunner.query(`ALTER TABLE "role_interface_elements" DROP COLUMN "can_view"`);
    await queryRunner.query(`ALTER TABLE "role_interface_elements" DROP COLUMN "can_edit"`);
    await queryRunner.query(`ALTER TABLE "role_interface_elements" DROP COLUMN "can_customize"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recréer les colonnes (sans données — perte d'info)
    await queryRunner.query(`ALTER TABLE "role_interface_elements" ADD "can_customize" boolean DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "role_interface_elements" ADD "can_edit" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "role_interface_elements" ADD "can_view" boolean DEFAULT true`);
  }
}
