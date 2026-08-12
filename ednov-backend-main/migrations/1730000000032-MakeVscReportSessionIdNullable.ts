import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeVscReportSessionIdNullable1730000000032
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rendre session_id nullable car les rapports automatiques (daily/weekly)
    // ne sont pas liés à une session spécifique mais sont des agrégations
    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      ALTER COLUMN "session_id" DROP NOT NULL;
    `);

    // Rendre student_id et volunteer_id également nullable
    // car les rapports automatiques ne sont pas liés à un étudiant/bénévole spécifique
    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      ALTER COLUMN "student_id" DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      ALTER COLUMN "volunteer_id" DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: On ne peut pas restaurer les contraintes NOT NULL
    // car il pourrait y avoir des données avec des valeurs NULL
    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      ALTER COLUMN "session_id" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      ALTER COLUMN "student_id" SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      ALTER COLUMN "volunteer_id" SET NOT NULL;
    `);
  }
}
