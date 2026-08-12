import { DataSource } from 'typeorm';
import * as data from './data/brandings.json';

export async function seedBrandings(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding brandings...');
  
  const brandings = Array.isArray(data) ? data : [];
  
  if (brandings.length === 0) {
    console.log('⚠️  No brandings data found');
    return;
  }

  try {
    for (const branding of brandings) {
      await ds.query(
        `INSERT INTO brandings (
          id, company_id, logo_url, logo_dark_url, favicon_url, background_color, text_color,
          font_family, font_url, border_radius, button_style, layout_type, custom_css, is_active,
          created_at, updated_at, logo1_light_url, logo1_dark_url, logo2_light_url, logo2_dark_url,
          logo3_light_url, logo3_dark_url, light_color1_nuance1, light_color1_nuance2, light_color1_nuance3,
          light_color2_nuance1, light_color2_nuance2, light_color2_nuance3, light_color3_nuance1, light_color3_nuance2,
          light_color3_nuance3, dark_color1_nuance1, dark_color1_nuance2, dark_color1_nuance3, dark_color2_nuance1,
          dark_color2_nuance2, dark_color2_nuance3, dark_color3_nuance1, dark_color3_nuance2, dark_color3_nuance3
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          branding.id, branding.company_id, branding.logo_url, branding.logo_dark_url, branding.favicon_url,
          branding.background_color, branding.text_color, branding.font_family, branding.font_url,
          branding.border_radius, branding.button_style, branding.layout_type, branding.custom_css,
          branding.is_active, branding.created_at, branding.updated_at, branding.logo1_light_url,
          branding.logo1_dark_url, branding.logo2_light_url, branding.logo2_dark_url, branding.logo3_light_url,
          branding.logo3_dark_url, branding.light_color1_nuance1, branding.light_color1_nuance2,
          branding.light_color1_nuance3, branding.light_color2_nuance1, branding.light_color2_nuance2,
          branding.light_color2_nuance3, branding.light_color3_nuance1, branding.light_color3_nuance2,
          branding.light_color3_nuance3, branding.dark_color1_nuance1, branding.dark_color1_nuance2,
          branding.dark_color1_nuance3, branding.dark_color2_nuance1, branding.dark_color2_nuance2,
          branding.dark_color2_nuance3, branding.dark_color3_nuance1, branding.dark_color3_nuance2,
          branding.dark_color3_nuance3,
        ]
      );
    }

    console.log(`✅ Inserted ${brandings.length} brandings`);
  } catch (error) {
    console.error('❌ Error seeding brandings:', error);
    throw error;
  }
}
