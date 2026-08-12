import { MigrationInterface, QueryRunner } from 'typeorm';

const MANAGER_DATA_MENUS = ['menu-sessions', 'menu-reports', 'menu-vsc-reports'];

/** Aligns manager role with seed matrix: same_establishment for sessions / reports / VSC reports. */
export class ManagerSessionsReportsVscSameEstablishmentScope1802600000000 implements MigrationInterface {
  private static readonly SAME_ESTABLISHMENT = JSON.stringify({ scope: 'same_establishment' });

  private static readonly UNRESTRICTED = JSON.stringify({ scope: 'unrestricted' });

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visibility_scope = $1::jsonb
      FROM roles r, interface_elements ie
      WHERE rie.role_id = r.id
        AND rie.element_id = ie.id
        AND rie.company_id = r.company_id
        AND rie.company_id = ie.company_id
        AND LOWER(r.code) = 'manager'
        AND ie.element_id = ANY($2::text[])
        AND ie.interface_name = 'sidebar'
        AND ie.element_type = 'menu'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [ManagerSessionsReportsVscSameEstablishmentScope1802600000000.SAME_ESTABLISHMENT, MANAGER_DATA_MENUS],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visibility_scope = $1::jsonb
      FROM roles r, interface_elements ie
      WHERE rie.role_id = r.id
        AND rie.element_id = ie.id
        AND rie.company_id = r.company_id
        AND rie.company_id = ie.company_id
        AND LOWER(r.code) = 'manager'
        AND ie.element_id = ANY($2::text[])
        AND ie.interface_name = 'sidebar'
        AND ie.element_type = 'menu'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [ManagerSessionsReportsVscSameEstablishmentScope1802600000000.UNRESTRICTED, MANAGER_DATA_MENUS],
    );
  }
}
