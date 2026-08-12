import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retire le filtre UI « Fréquence rapports VSC » (filter-vsc-frequency) de l’interface volunteers :
 * suppression des liaisons RIE puis soft-delete des interface_elements correspondants.
 */
export class RemoveVolunteersVscFrequencyFilterInterfaceElement1802800000000 implements MigrationInterface {
  name = 'RemoveVolunteersVscFrequencyFilterInterfaceElement1802800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_interface_elements
      WHERE element_id IN (
        SELECT id FROM interface_elements
        WHERE interface_name = 'volunteers'
          AND element_id = 'filter-vsc-frequency'
          AND deleted_at IS NULL
      )
    `);
    await queryRunner.query(`
      UPDATE interface_elements
      SET deleted_at = now(), updated_at = now()
      WHERE interface_name = 'volunteers'
        AND element_id = 'filter-vsc-frequency'
        AND deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE interface_elements
      SET deleted_at = NULL, updated_at = now()
      WHERE interface_name = 'volunteers'
        AND element_id = 'filter-vsc-frequency'
        AND deleted_at IS NOT NULL
    `);
    // Les lignes role_interface_elements supprimées ne sont pas restaurées (ré-attribution manuelle / re-seed si besoin).
  }
}
