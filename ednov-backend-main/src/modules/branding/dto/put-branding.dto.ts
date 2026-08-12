import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength } from 'class-validator';

export class PutBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoDarkUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo1LightUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo1DarkUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo2LightUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo2DarkUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo3LightUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logo3DarkUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  faviconUrl?: string | null;

  // Light mode colors - Couleur 1
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor1Nuance1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor1Nuance2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor1Nuance3?: string | null;

  // Light mode colors - Couleur 2
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor2Nuance1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor2Nuance2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor2Nuance3?: string | null;

  // Light mode colors - Couleur 3
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor3Nuance1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor3Nuance2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lightColor3Nuance3?: string | null;

  // Dark mode colors - Couleur 1
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor1Nuance1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor1Nuance2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor1Nuance3?: string | null;

  // Dark mode colors - Couleur 2
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor2Nuance1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor2Nuance2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor2Nuance3?: string | null;

  // Dark mode colors - Couleur 3
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor3Nuance1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor3Nuance2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  darkColor3Nuance3?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  backgroundColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  textColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fontFamily?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fontUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  borderRadius?: string | null;

  @ApiPropertyOptional({ enum: ['rounded', 'square', 'pill'] })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  buttonStyle?: string | null;

  @ApiPropertyOptional({ enum: ['default', 'compact', 'modern'] })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  layoutType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCss?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
