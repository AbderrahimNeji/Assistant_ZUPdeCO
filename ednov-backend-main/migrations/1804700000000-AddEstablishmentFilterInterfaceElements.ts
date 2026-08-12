import { MigrationInterface, QueryRunner } from 'typeorm';

const INTERFACE_NAME = 'establishments';

const NEW_FILTERS = [
  { elementId: 'establishment-categories', label: 'Catégorie (Public/Privé)' },
  { elementId: 'establishment-priority-networks', label: 'Réseau prioritaire (REP/REP+)' },
  { elementId: 'establishment-qpv', label: 'QPV' },
] as const;

/**
 * Adds three filter interface_elements for the establishments page:
 *  - establishment-categories (Public/Privé)
 *  - establishment-priority-networks (REP/REP+)
 *  - establishment-qpv (QPV)
 *
 * Idempotent: uses INSERT … WHERE NOT EXISTS per company.
 * Also inserts matching role_interface_elements for all roles.
 */
export class AddEstablishmentFilterInterfaceElements1804700000000
  implements MigrationInterface
{
  name = 'AddEstablishmentFilterInterfaceElements1804700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const filter of NEW_FILTERS) {
      await this.insertFilter(queryRunner, filter.elementId, filter.label);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const filter of NEW_FILTERS) {
      await queryRunner.query(
        `
        DELETE FROM role_interface_elements rie
        USING interface_elements ie
        WHERE rie.element_id = ie.id
          AND ie.element_id = $1::varchar
          AND ie.interface_name = $2::varchar
        `,
        [filter.elementId, INTERFACE_NAME],
      );

      await queryRunner.query(
        `
        DELETE FROM interface_elements
        WHERE element_id = $1::varchar
          AND interface_name = $2::varchar
        `,
        [filter.elementId, INTERFACE_NAME],
      );
    }
  }

  private async insertFilter(
    queryRunner: QueryRunner,
    elementId: string,
    label: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO interface_elements (
        id, company_id, interface_name, element_id, element_type, element_label,
        config, created_at, updated_at, deleted_at,
        group_label, group_icon, group_order,
        parent_id, entity_sub_key, entity_filter, mode
      )
      SELECT
        gen_random_uuid(),
        c.company_id,
        $2::varchar,
        $1::varchar,
        'filter',
        $3::varchar,
        NULL,
        NOW(), NOW(), NULL,
        NULL, NULL, 0,
        NULL, NULL, NULL, NULL
      FROM (
        SELECT DISTINCT company_id
        FROM interface_elements
        WHERE interface_name = $2::varchar
          AND deleted_at IS NULL
      ) c
      WHERE NOT EXISTS (
        SELECT 1
        FROM interface_elements ie
        WHERE ie.company_id = c.company_id
          AND ie.element_id = $1::varchar
          AND ie.interface_name = $2::varchar
          AND ie.deleted_at IS NULL
      )
      `,
      [elementId, INTERFACE_NAME, label],
    );

    await queryRunner.query(
      `
      INSERT INTO role_interface_elements (
        id, company_id, role_id, element_id,
        created_at, updated_at, visibility_scope, "order", visible, width
      )
      SELECT
        gen_random_uuid(),
        ie.company_id,
        r.id,
        ie.id,
        NOW(), NOW(), NULL, NULL,
        true,
        NULL
      FROM interface_elements ie
      INNER JOIN roles r ON r.company_id = ie.company_id AND r.deleted_at IS NULL
      WHERE ie.element_id = $1::varchar
        AND ie.interface_name = $2::varchar
        AND ie.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM role_interface_elements rie
          WHERE rie.role_id = r.id
            AND rie.element_id = ie.id
            AND rie.company_id = ie.company_id
        )
      `,
      [elementId, INTERFACE_NAME],
    );
  }
}
