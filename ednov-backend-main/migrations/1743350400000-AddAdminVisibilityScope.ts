import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAdminVisibilityScope1743350400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('role_interface_elements', new TableColumn({
      name: 'visibility_scope',
      type: 'jsonb',
      isNullable: true,
      default: null,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('role_interface_elements', 'visibility_scope');
  }
}
