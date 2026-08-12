import { Entity, Column, OneToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export type ButtonStyle = 'rounded' | 'square' | 'pill';
export type LayoutType = 'default' | 'compact' | 'modern';

@Entity({ name: 'brandings' })
export class Branding extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id', unique: true })
  companyId: string;

  @OneToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 500, name: 'logo_url', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo_dark_url', nullable: true })
  logoDarkUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo1_light_url', nullable: true })
  logo1LightUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo1_dark_url', nullable: true })
  logo1DarkUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo2_light_url', nullable: true })
  logo2LightUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo2_dark_url', nullable: true })
  logo2DarkUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo3_light_url', nullable: true })
  logo3LightUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'logo3_dark_url', nullable: true })
  logo3DarkUrl: string | null;

  @Column({ type: 'varchar', length: 500, name: 'favicon_url', nullable: true })
  faviconUrl: string | null;

  // Light mode colors - Couleur 1 (Primary)
  @Column({ type: 'varchar', length: 20, name: 'light_color1_nuance1', nullable: true })
  lightColor1Nuance1: string | null;

  @Column({ type: 'varchar', length: 20, name: 'light_color1_nuance2', nullable: true })
  lightColor1Nuance2: string | null;

  @Column({ type: 'varchar', length: 20, name: 'light_color1_nuance3', nullable: true })
  lightColor1Nuance3: string | null;

  // Light mode colors - Couleur 2 (Secondary)
  @Column({ type: 'varchar', length: 20, name: 'light_color2_nuance1', nullable: true })
  lightColor2Nuance1: string | null;

  @Column({ type: 'varchar', length: 20, name: 'light_color2_nuance2', nullable: true })
  lightColor2Nuance2: string | null;

  @Column({ type: 'varchar', length: 20, name: 'light_color2_nuance3', nullable: true })
  lightColor2Nuance3: string | null;

  // Light mode colors - Couleur 3 (Accent)
  @Column({ type: 'varchar', length: 20, name: 'light_color3_nuance1', nullable: true })
  lightColor3Nuance1: string | null;

  @Column({ type: 'varchar', length: 20, name: 'light_color3_nuance2', nullable: true })
  lightColor3Nuance2: string | null;

  @Column({ type: 'varchar', length: 20, name: 'light_color3_nuance3', nullable: true })
  lightColor3Nuance3: string | null;

  // Dark mode colors - Couleur 1 (Primary)
  @Column({ type: 'varchar', length: 20, name: 'dark_color1_nuance1', nullable: true })
  darkColor1Nuance1: string | null;

  @Column({ type: 'varchar', length: 20, name: 'dark_color1_nuance2', nullable: true })
  darkColor1Nuance2: string | null;

  @Column({ type: 'varchar', length: 20, name: 'dark_color1_nuance3', nullable: true })
  darkColor1Nuance3: string | null;

  // Dark mode colors - Couleur 2 (Secondary)
  @Column({ type: 'varchar', length: 20, name: 'dark_color2_nuance1', nullable: true })
  darkColor2Nuance1: string | null;

  @Column({ type: 'varchar', length: 20, name: 'dark_color2_nuance2', nullable: true })
  darkColor2Nuance2: string | null;

  @Column({ type: 'varchar', length: 20, name: 'dark_color2_nuance3', nullable: true })
  darkColor2Nuance3: string | null;

  // Dark mode colors - Couleur 3 (Accent)
  @Column({ type: 'varchar', length: 20, name: 'dark_color3_nuance1', nullable: true })
  darkColor3Nuance1: string | null;

  @Column({ type: 'varchar', length: 20, name: 'dark_color3_nuance2', nullable: true })
  darkColor3Nuance2: string | null;

  @Column({ type: 'varchar', length: 20, name: 'dark_color3_nuance3', nullable: true })
  darkColor3Nuance3: string | null;

  @Column({ type: 'varchar', length: 20, name: 'background_color', nullable: true })
  backgroundColor: string | null;

  @Column({ type: 'varchar', length: 20, name: 'text_color', nullable: true })
  textColor: string | null;

  @Column({ type: 'varchar', length: 100, name: 'font_family', nullable: true })
  fontFamily: string | null;

  @Column({ type: 'varchar', length: 500, name: 'font_url', nullable: true })
  fontUrl: string | null;

  @Column({ type: 'varchar', length: 50, name: 'border_radius', nullable: true })
  borderRadius: string | null;

  @Column({ type: 'varchar', length: 20, name: 'button_style', nullable: true })
  buttonStyle: ButtonStyle | null;

  @Column({ type: 'varchar', length: 20, name: 'layout_type', default: 'default' })
  layoutType: LayoutType;

  @Column({ type: 'text', name: 'custom_css', nullable: true })
  customCss: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
