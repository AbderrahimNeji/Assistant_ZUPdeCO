import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsString,
  IsBoolean,
} from 'class-validator';

export class ListVscDailyReportsQueryDto {
  @ApiPropertyOptional({
    description:
      'If true, returns an Excel (.xlsx) download instead of JSON (legacy name: exportCsv)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === true || value === false) return value;
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim();
      if (v === 'true') return true;
      if (v === 'false') return false;
    }
    return value;
  })
  @IsBoolean()
  exportCsv?: boolean;

  @ApiPropertyOptional({
    description: 'Alias for exportCsv: if true, returns an Excel (.xlsx) download instead of JSON',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === true || value === false) return value;
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim();
      if (v === 'true') return true;
      if (v === 'false') return false;
    }
    return value;
  })
  @IsBoolean()
  exportExcel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  establishmentId?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  reportDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  reportDateFrom?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  reportDateTo?: string;

  @ApiPropertyOptional({ enum: ['to_fill', 'submitted', 'validated'] })
  @IsOptional()
  @IsIn(['to_fill', 'submitted', 'validated'])
  status?: 'to_fill' | 'submitted' | 'validated';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return value;
  })
  @IsArray()
  @IsIn(['to_fill', 'submitted', 'validated'], { each: true })
  statuses?: ('to_fill' | 'submitted' | 'validated')[];

  @ApiPropertyOptional({
    description: 'Recherche sur prénom, nom, nom complet ou email du VSC assigné',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  /**
   * When absent or false, rows with `visible_at` in the future are excluded for every role (same
   * window as PATCH for VSC). Set true to include scheduled rows (e.g. coordinator panel with
   * “not yet visible” state).
   */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === true || value === false) return value;
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim();
      if (v === 'true') return true;
      if (v === 'false') return false;
    }
    return value;
  })
  @IsBoolean()
  includeNotYetVisible?: boolean;
}

export class UpdateVscDailyReportDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string | null;

  @ApiPropertyOptional({ enum: ['to_fill', 'submitted'] })
  @IsOptional()
  @IsIn(['to_fill', 'submitted'])
  status?: 'to_fill' | 'submitted';
}
