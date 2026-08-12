import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration pour ajouter la configuration des fréquences de rapports VSC automatiques
 * dans la table user_profiles.
 */
export class AddVscReportsFrequenciesToUserProfiles1730000000031 implements MigrationInterface {
  name = 'AddVscReportsFrequenciesToUserProfiles1730000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajout du champ vsc_reports_frequencies dans user_profiles
    await queryRunner.query(`
      ALTER TABLE user_profiles
        ADD COLUMN vsc_reports_frequencies JSONB DEFAULT '{"daily": false, "weekly": false}'::jsonb
    `);

    // Index GIN pour requêtes performantes sur les fréquences
    await queryRunner.query(`
      CREATE INDEX idx_user_profiles_vsc_reports_frequencies 
      ON user_profiles USING gin(vsc_reports_frequencies)
    `);

    // Commentaire pour documentation
    await queryRunner.query(`
      COMMENT ON COLUMN user_profiles.vsc_reports_frequencies IS 
      'Configuration des rapports automatiques VSC : {"daily": boolean, "weekly": boolean}'
    `);

    // Initialiser les valeurs par défaut pour les profils existants
    await queryRunner.query(`
      UPDATE user_profiles
      SET vsc_reports_frequencies = '{"daily": false, "weekly": false}'::jsonb
      WHERE vsc_reports_frequencies IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression de l'index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_user_profiles_vsc_reports_frequencies
    `);

    // Suppression de la colonne
    await queryRunner.query(`
      ALTER TABLE user_profiles
        DROP COLUMN IF EXISTS vsc_reports_frequencies
    `);
  }
}
