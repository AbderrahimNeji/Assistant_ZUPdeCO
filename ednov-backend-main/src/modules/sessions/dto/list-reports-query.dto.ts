import { IsOptional, IsUUID, IsDateString, IsInt, IsArray, IsIn, IsString, Min, Max, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { SessionType } from '../entities/session.entity';
import { SESSION_TYPES } from '../session-types.constants';
const REPORT_STATUSES = ['to_complete', 'draft', 'submitted', 'validated', 'overdue'] as const;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListReportsQueryDto {
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
    enum: REPORT_STATUSES,
    description: 'Filter by report status (one or many). Repeated: ?statuses=draft&statuses=submitted',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsIn(REPORT_STATUSES, { each: true })
  statuses?: string[];

  @ApiPropertyOptional({
    isArray: true,
    type: Number,
    description: 'Filter by ratings (1-5). Repeated: ?ratings=4&ratings=5',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map(Number);
    if (value != null) return [Number(value)];
    return undefined;
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  ratings?: number[];

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Filter reports from this date (inclusive, on createdAt)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Filter reports until this date (inclusive, on createdAt)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    isArray: true,
    enum: SESSION_TYPES,
    description: 'Filter by session type. Repeated: ?sessionTypes=homework_help&sessionTypes=workshop',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsIn(SESSION_TYPES, { each: true })
  sessionTypes?: SessionType[];

  @ApiPropertyOptional({
    isArray: true,
    description: 'Filter by establishment IDs. Repeated: ?establishmentIds=uuid1&establishmentIds=uuid2',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  establishmentIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by tutor/manager user ID (session.managedById)' })
  @IsOptional()
  @IsUUID('4')
  tutorId?: string;

  @ApiPropertyOptional({ description: 'Filter by participant user ID' })
  @IsOptional()
  @IsUUID('4')
  participantId?: string;

  @ApiPropertyOptional({ description: 'Filter by session ID' })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Search text in report comment/script/subject' })
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
