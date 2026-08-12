import { IsOptional, IsUUID, IsDateString, IsInt, IsArray, IsIn, IsString, Min, Max, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

const VSC_REPORT_STATUSES = ['draft', 'submitted', 'validated'] as const;
const VSC_CATEGORIES = ['daily', 'weekly'] as const;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListVscReportsQueryDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'If true, returns an Excel (.xlsx) download instead of the paginated JSON list (legacy name: exportCsv)',
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
    default: false,
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

  @ApiPropertyOptional({
    isArray: true,
    enum: VSC_REPORT_STATUSES,
    description: 'Filter by VSC report status. Repeated: ?statuses=draft&statuses=submitted',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsIn(VSC_REPORT_STATUSES, { each: true })
  statuses?: string[];

  @ApiPropertyOptional({
    isArray: true,
    enum: VSC_CATEGORIES,
    description: 'Filter by category. Repeated: ?categories=daily&categories=weekly',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsIn(VSC_CATEGORIES, { each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Filter VSC reports from this date (inclusive, on createdAt)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Filter VSC reports until this date (inclusive, on createdAt)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID (volunteer/student concerned)' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by session ID' })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Filter by establishment ID' })
  @IsOptional()
  @IsUUID('4')
  establishmentId?: string;

  @ApiPropertyOptional({ description: 'Search text in VSC report content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: DEFAULT_PAGE, minimum: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, minimum: 1, maximum: MAX_PAGE_SIZE, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;
}
