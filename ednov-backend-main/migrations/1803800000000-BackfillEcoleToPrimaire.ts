import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reclasse les établissements type='other' dont gov_data.type_etablissement='Ecole'
 * vers type='primaire' (~48 656 lignes).
 * Les autres sous-types (Médico-social, Autre, EREA, null) restent 'other'.
 */
export class BackfillEcoleToPrimaire1803800000000 implements MigrationInterface {
  name = 'BackfillEcoleToPrimaire1803800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE establishments
      SET    type       = 'primaire',
             updated_at = NOW()
      WHERE  deleted_at IS NULL
        AND  type       = 'other'
        AND  gov_data->>'type_etablissement' = 'Ecole'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE establishments
      SET    type       = 'other',
             updated_at = NOW()
      WHERE  deleted_at IS NULL
        AND  type       = 'primaire'
        AND  gov_data->>'type_etablissement' = 'Ecole'
    `);
  }
}
