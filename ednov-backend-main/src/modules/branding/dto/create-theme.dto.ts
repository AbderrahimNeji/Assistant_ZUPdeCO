import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject, IsEnum, MaxLength } from 'class-validator';
import { ThemeMode } from '../entities/theme.entity';

export class CreateThemeDto {
  @ApiProperty({ example: 'Default Light' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'default-light' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ enum: ['light', 'dark', 'auto'] })
  @IsEnum(['light', 'dark', 'auto'])
  mode!: ThemeMode;

  @ApiPropertyOptional({ default: {} })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
