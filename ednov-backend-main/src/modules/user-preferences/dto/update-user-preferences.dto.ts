import { IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InterfaceConfig } from '../entities/user-interface-preference.entity';

export class UpdateUserPreferencesDto {
  @ApiProperty({ description: 'Dark mode preference', required: false })
  @IsOptional()
  @IsBoolean()
  isDarkMode?: boolean;

  @ApiProperty({ description: 'Interface-specific configurations (JSONB)', required: false })
  @IsOptional()
  @IsObject()
  interfaceConfigs?: InterfaceConfig;
}
