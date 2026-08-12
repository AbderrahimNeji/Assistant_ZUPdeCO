import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Changement isolé : un seul rôle (`manager`) et un seul menu sidebar (`menu-admins`).
 * Ce menu est celui utilisé par `GET /api/v1/users/admins` via `@LinkedElement('menu-admins','sidebar')`.
 *
 * Ne modifie aucun autre `visibility_scope` ni le JSON des seeders.
 * Pour une BDD déjà passée par `1777000000000`, cette migration remplace l’ancien scope
 * `same_establishment_or_managed_by` par `same_establishment` pour les managers uniquement.
 */
export class ManagerMenuAdminsSameEstablishmentScope1802700000000 implements MigrationInterface {
  private static readonly SAME_ESTABLISHMENT = JSON.stringify({
    scope: 'same_establishment',
    relations: ['establishment'],
  });

  private static readonly PREVIOUS_SCOPE = JSON.stringify({
    scope: 'same_establishment_or_managed_by',
    relations: ['establishment', 'managedBy'],
    operator: 'OR',
  });

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
        AND ie.element_id = 'menu-admins'
        AND ie.interface_name = 'sidebar'
        AND ie.element_type = 'menu'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [ManagerMenuAdminsSameEstablishmentScope1802700000000.SAME_ESTABLISHMENT],
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
        AND ie.element_id = 'menu-admins'
        AND ie.interface_name = 'sidebar'
        AND ie.element_type = 'menu'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [ManagerMenuAdminsSameEstablishmentScope1802700000000.PREVIOUS_SCOPE],
    );
  }
}
