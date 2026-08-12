import { IsOptional, IsUUID, IsDateString, IsEnum, IsInt, IsArray, IsIn, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { SessionStatus, SessionType } from '../entities/session.entity';
import { SESSION_TYPES } from '../session-types.constants';

/** Normalize a single status string: accepts lowercase → backend enum uppercase. */
function normalizeStatus(value: unknown): string | undefined {
  if (value == null || typeof value !== 'string') return undefined;
  const upper = value.toUpperCase();
  if (Object.values(SessionStatus).includes(upper as SessionStatus)) return upper;
  return undefined;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class ListSessionsQueryDto {
  @ApiPropertyOptional({ example: '2025-01-01', description: 'Filter sessions from this date (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Filter sessions until this date (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    isArray: true,
    enum: SessionStatus,
    description: 'Filter by status (one or many, accepts lowercase). Repeated: ?statuses=planned&statuses=completed',
  })
  @IsOptional()
  @Transform(({ value }) => {
    let arr: unknown[];
    if (Array.isArray(value)) {
      arr = value;
    } else if (value == null) {
      arr = [];
    } else {
      arr = [value];
    }
    return arr.map(normalizeStatus).filter(Boolean);
  })
  @IsArray()
  @IsEnum(SessionStatus, { each: true })
  statuses?: SessionStatus[];

  @ApiPropertyOptional({ description: 'Filter by establishment ID' })
  @IsOptional()
  @IsUUID('4')
  establishmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by room ID' })
  @IsOptional()
  @IsUUID('4')
  roomId?: string;

  @ApiPropertyOptional({
    isArray: true,
    enum: SESSION_TYPES,
    description: 'Filter by session type (one or many). Repeated: ?types=homework_help&types=workshop',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsIn(SESSION_TYPES, { each: true })
  types?: SessionType[];

  @ApiPropertyOptional({ description: 'Filter by school year ID' })
  @IsOptional()
  @IsUUID('4')
  schoolYearId?: string;

  @ApiPropertyOptional({ description: 'Filter by tutor / manager user ID' })
  @IsOptional()
  @IsUUID('4')
  managedById?: string;

  @ApiPropertyOptional({ description: 'Filter by activity ID' })
  @IsOptional()
  @IsUUID('4')
  activityId?: string;

  @ApiPropertyOptional({ description: 'Filter by subject ID' })
  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Filter by level ID' })
  @IsOptional()
  @IsUUID('4')
  levelId?: string;

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

  @ApiPropertyOptional({ 
    description: 'Field to sort by (e.g., sessionDate, createdAt, updatedAt)',
    example: 'sessionDate'
  })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ 
    enum: ['asc', 'desc'],
    description: 'Sort order (asc or desc)',
    example: 'asc'
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Search by participant name (tutor, student, volunteer)', example: 'Jean' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by recurrence type',
    enum: ['none', 'once', 'daily', 'weekly', 'several_days_per_week', 'biweekly', 'monthly', 'ab', 'custom'],
    example: 'weekly'
  })
  @IsOptional()
  @IsString()
  recurrenceType?: string;
}
