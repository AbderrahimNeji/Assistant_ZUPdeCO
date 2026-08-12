import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { HolidayType } from '../entities/holiday.entity';

export class UpdateHolidayDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['national', 'regional', 'establishment_specific'])
  type?: HolidayType;

  @ApiPropertyOptional({ description: 'Vacances scolaires par zone; null pour retirer' })
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurringYearly?: boolean;
}
