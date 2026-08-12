import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorBrandingWithClearNaming1730000000006 implements MigrationInterface {
  name = 'RefactorBrandingWithClearNaming1730000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old columns if they exist (from previous migration)
    await queryRunner.query(`
      ALTER TABLE brandings
        DROP COLUMN IF EXISTS primary_color,
        DROP COLUMN IF EXISTS primary_color_hover,
        DROP COLUMN IF EXISTS primary_color_active,
        DROP COLUMN IF EXISTS secondary_color,
        DROP COLUMN IF EXISTS secondary_color_hover,
        DROP COLUMN IF EXISTS secondary_color_light,
        DROP COLUMN IF EXISTS accent_color,
        DROP COLUMN IF EXISTS accent_color_hover,
        DROP COLUMN IF EXISTS accent_color_light,
        DROP COLUMN IF EXISTS light_primary_color,
        DROP COLUMN IF EXISTS light_primary_color_hover,
        DROP COLUMN IF EXISTS light_primary_color_active,
        DROP COLUMN IF EXISTS light_secondary_color,
        DROP COLUMN IF EXISTS light_secondary_color_hover,
        DROP COLUMN IF EXISTS light_secondary_color_light,
        DROP COLUMN IF EXISTS light_accent_color,
        DROP COLUMN IF EXISTS light_accent_color_hover,
        DROP COLUMN IF EXISTS light_accent_color_light,
        DROP COLUMN IF EXISTS dark_primary_color,
        DROP COLUMN IF EXISTS dark_primary_color_hover,
        DROP COLUMN IF EXISTS dark_primary_color_active,
        DROP COLUMN IF EXISTS dark_secondary_color,
        DROP COLUMN IF EXISTS dark_secondary_color_hover,
        DROP COLUMN IF EXISTS dark_secondary_color_light,
        DROP COLUMN IF EXISTS dark_accent_color,
        DROP COLUMN IF EXISTS dark_accent_color_hover,
        DROP COLUMN IF EXISTS dark_accent_color_light,
        DROP COLUMN IF EXISTS logo_monochrome_url,
        DROP COLUMN IF EXISTS logo_icon_url,
        DROP COLUMN IF EXISTS dark_logo_monochrome_url,
        DROP COLUMN IF EXISTS dark_logo_icon_url
    `);

    // Add new logo columns with clear naming
    await queryRunner.query(`
      ALTER TABLE brandings
        ADD COLUMN logo1_light_url VARCHAR(500),
        ADD COLUMN logo1_dark_url VARCHAR(500),
        ADD COLUMN logo2_light_url VARCHAR(500),
        ADD COLUMN logo2_dark_url VARCHAR(500),
        ADD COLUMN logo3_light_url VARCHAR(500),
        ADD COLUMN logo3_dark_url VARCHAR(500)
    `);

    // Add Light Mode colors (3 colors × 3 nuances = 9 columns)
    await queryRunner.query(`
      ALTER TABLE brandings
        ADD COLUMN light_color1_nuance1 VARCHAR(20),
        ADD COLUMN light_color1_nuance2 VARCHAR(20),
        ADD COLUMN light_color1_nuance3 VARCHAR(20),
        ADD COLUMN light_color2_nuance1 VARCHAR(20),
        ADD COLUMN light_color2_nuance2 VARCHAR(20),
        ADD COLUMN light_color2_nuance3 VARCHAR(20),
        ADD COLUMN light_color3_nuance1 VARCHAR(20),
        ADD COLUMN light_color3_nuance2 VARCHAR(20),
        ADD COLUMN light_color3_nuance3 VARCHAR(20)
    `);

    // Add Dark Mode colors (3 colors × 3 nuances = 9 columns)
    await queryRunner.query(`
      ALTER TABLE brandings
        ADD COLUMN dark_color1_nuance1 VARCHAR(20),
        ADD COLUMN dark_color1_nuance2 VARCHAR(20),
        ADD COLUMN dark_color1_nuance3 VARCHAR(20),
        ADD COLUMN dark_color2_nuance1 VARCHAR(20),
        ADD COLUMN dark_color2_nuance2 VARCHAR(20),
        ADD COLUMN dark_color2_nuance3 VARCHAR(20),
        ADD COLUMN dark_color3_nuance1 VARCHAR(20),
        ADD COLUMN dark_color3_nuance2 VARCHAR(20),
        ADD COLUMN dark_color3_nuance3 VARCHAR(20)
    `);

    // Add comments for logos
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.logo1_light_url IS 'Logo 1 (principal) - Light mode'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.logo1_dark_url IS 'Logo 1 (principal) - Dark mode'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.logo2_light_url IS 'Logo 2 (monochrome) - Light mode'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.logo2_dark_url IS 'Logo 2 (monochrome) - Dark mode'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.logo3_light_url IS 'Logo 3 (icône) - Light mode'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.logo3_dark_url IS 'Logo 3 (icône) - Dark mode'
    `);

    // Add comments for Light mode colors
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color1_nuance1 IS 'Light mode: Couleur 1 (Primary - boutons, icônes principales) - Nuance 1'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color1_nuance2 IS 'Light mode: Couleur 1 (Primary) - Nuance 2 (hover boutons)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color1_nuance3 IS 'Light mode: Couleur 1 (Primary) - Nuance 3 (hover menus)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color2_nuance1 IS 'Light mode: Couleur 2 (Secondary - titres) - Nuance 1'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color2_nuance2 IS 'Light mode: Couleur 2 (Secondary) - Nuance 2 (borders colorés)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color2_nuance3 IS 'Light mode: Couleur 2 (Secondary) - Nuance 3 (backgrounds subtils)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color3_nuance1 IS 'Light mode: Couleur 3 (Accent - spinners, loaders) - Nuance 1'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color3_nuance2 IS 'Light mode: Couleur 3 (Accent) - Nuance 2'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.light_color3_nuance3 IS 'Light mode: Couleur 3 (Accent) - Nuance 3'
    `);

    // Add comments for Dark mode colors
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color1_nuance1 IS 'Dark mode: Couleur 1 (Primary - boutons, icônes principales) - Nuance 1'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color1_nuance2 IS 'Dark mode: Couleur 1 (Primary) - Nuance 2 (hover boutons)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color1_nuance3 IS 'Dark mode: Couleur 1 (Primary) - Nuance 3 (hover menus)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color2_nuance1 IS 'Dark mode: Couleur 2 (Secondary - titres) - Nuance 1'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color2_nuance2 IS 'Dark mode: Couleur 2 (Secondary) - Nuance 2 (borders colorés)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color2_nuance3 IS 'Dark mode: Couleur 2 (Secondary) - Nuance 3 (backgrounds subtils)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color3_nuance1 IS 'Dark mode: Couleur 3 (Accent - spinners, loaders) - Nuance 1'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color3_nuance2 IS 'Dark mode: Couleur 3 (Accent) - Nuance 2'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN brandings.dark_color3_nuance3 IS 'Dark mode: Couleur 3 (Accent) - Nuance 3'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all new columns
    await queryRunner.query(`
      ALTER TABLE brandings
        DROP COLUMN IF EXISTS logo1_light_url,
        DROP COLUMN IF EXISTS logo1_dark_url,
        DROP COLUMN IF EXISTS logo2_light_url,
        DROP COLUMN IF EXISTS logo2_dark_url,
        DROP COLUMN IF EXISTS logo3_light_url,
        DROP COLUMN IF EXISTS logo3_dark_url,
        DROP COLUMN IF EXISTS light_color1_nuance1,
        DROP COLUMN IF EXISTS light_color1_nuance2,
        DROP COLUMN IF EXISTS light_color1_nuance3,
        DROP COLUMN IF EXISTS light_color2_nuance1,
        DROP COLUMN IF EXISTS light_color2_nuance2,
        DROP COLUMN IF EXISTS light_color2_nuance3,
        DROP COLUMN IF EXISTS light_color3_nuance1,
        DROP COLUMN IF EXISTS light_color3_nuance2,
        DROP COLUMN IF EXISTS light_color3_nuance3,
        DROP COLUMN IF EXISTS dark_color1_nuance1,
        DROP COLUMN IF EXISTS dark_color1_nuance2,
        DROP COLUMN IF EXISTS dark_color1_nuance3,
        DROP COLUMN IF EXISTS dark_color2_nuance1,
        DROP COLUMN IF EXISTS dark_color2_nuance2,
        DROP COLUMN IF EXISTS dark_color2_nuance3,
        DROP COLUMN IF EXISTS dark_color3_nuance1,
        DROP COLUMN IF EXISTS dark_color3_nuance2,
        DROP COLUMN IF EXISTS dark_color3_nuance3
    `);
  }
}
