import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendBrandingsTable1730000000004 implements MigrationInterface {
  name = 'ExtendBrandingsTable1730000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add additional logo variants
    await queryRunner.query(`
      ALTER TABLE brandings
        ADD COLUMN logo_monochrome_url VARCHAR(500),
        ADD COLUMN logo_icon_url VARCHAR(500)
    `);

    // Add color nuances for primary color
    await queryRunner.query(`
      ALTER TABLE brandings
        ADD COLUMN primary_color_hover VARCHAR(20),
        ADD COLUMN primary_color_active VARCHAR(20)
    `);

    // Add color nuances for secondary color
    await queryRunner.query(`
      ALTER TABLE brandings
        ADD COLUMN secondary_color_hover VARCHAR(20),
        ADD COLUMN secondary_color_light VARCHAR(20)
    `);

    // Add color nuances for accent color
    await queryRunner.query(`
      ALTER TABLE brandings
        ADD COLUMN accent_color_hover VARCHAR(20),
        ADD COLUMN accent_color_light VARCHAR(20)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.logo_monochrome_url IS 'Monochrome version of the logo for specific use cases'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN brandings.logo_icon_url IS 'Icon-only version of the logo (favicon, app icon)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN brandings.primary_color_hover IS 'Primary color hover state (buttons, icons)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN brandings.primary_color_active IS 'Primary color active state (pressed buttons)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN brandings.secondary_color_hover IS 'Secondary color hover state (titles, borders)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN brandings.secondary_color_light IS 'Secondary color light variant (backgrounds, subtle elements)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN brandings.accent_color_hover IS 'Accent color hover state (spinners, loaders)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN brandings.accent_color_light IS 'Accent color light variant'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE brandings
        DROP COLUMN IF EXISTS logo_monochrome_url,
        DROP COLUMN IF EXISTS logo_icon_url,
        DROP COLUMN IF EXISTS primary_color_hover,
        DROP COLUMN IF EXISTS primary_color_active,
        DROP COLUMN IF EXISTS secondary_color_hover,
        DROP COLUMN IF EXISTS secondary_color_light,
        DROP COLUMN IF EXISTS accent_color_hover,
        DROP COLUMN IF EXISTS accent_color_light
    `);
  }
}
