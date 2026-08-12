import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class PutSettingsDto {
  @ApiProperty({ description: 'Key-value settings for the company', example: { timezone: 'Europe/Paris', locale: 'fr' } })
  @IsObject()
  settings!: Record<string, unknown>;
}
