import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { HolidayType } from '../entities/holiday.entity';

export class CreateHolidayDto {
  @ApiProperty({ example: 'Vacances de Noël' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: '2024-12-21' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-01-05' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: ['national', 'regional', 'establishment_specific'] })
  @IsEnum(['national', 'regional', 'establishment_specific'])
  type!: HolidayType;

  @ApiPropertyOptional({ description: 'Vacances scolaires par zone (France A/B/C); optionnel' })
  @IsOptional()
  @IsUUID()
  vacationZoneId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  establishmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  establishmentName?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurringYearly?: boolean;
}
