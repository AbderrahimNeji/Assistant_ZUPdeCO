import { MigrationInterface, QueryRunner } from 'typeorm';

const MENU_MATCHING = 'menu-matching';
const NEW_LABEL = 'Gestion des binômes';
const OLD_LABEL = 'Matching';

/**
 * Renomme l’entrée sidebar « Matching » en « Gestion des binômes ».
 */
export class RenameMatchingMenuToGestionBinomes1803900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE interface_elements
      SET element_label = $1, updated_at = NOW()
      WHERE element_id = $2
        AND interface_name = 'sidebar'
        AND element_type = 'menu'
        AND deleted_at IS NULL
      `,
      [NEW_LABEL, MENU_MATCHING],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE interface_elements
      SET element_label = $1, updated_at = NOW()
      WHERE element_id = $2
        AND interface_name = 'sidebar'
        AND element_type = 'menu'
        AND deleted_at IS NULL
      `,
      [OLD_LABEL, MENU_MATCHING],
    );
  }
}
