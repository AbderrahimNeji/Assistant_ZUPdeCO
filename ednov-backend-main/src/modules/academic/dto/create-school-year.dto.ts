import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { SchoolYearStatus } from '../entities/school-year.entity';

export class CreateSchoolYearDto {
  @ApiProperty({ example: '2025-2026' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ example: '2024-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-06-30' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ enum: ['active', 'closed'] })
  @IsOptional()
  @IsEnum(['active', 'closed'])
  status?: SchoolYearStatus;
}
