import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsIn,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  Matches,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { USER_ACCOUNT_STATUS_VALUES } from '../user-status';

export class ListUsersByRoleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Unused on list endpoints; use GET /users/students|tutors|volunteers/export for Excel (.xlsx).',
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

  @ApiPropertyOptional({ description: 'Search in first name, last name, email, display name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Comma-separated list of user IDs to exclude from results',
    example: 'uuid1,uuid2,uuid3'
  })
  @IsOptional()
  @IsString()
  excludeIds?: string;

  @ApiPropertyOptional({
    isArray: true,
    enum: USER_ACCOUNT_STATUS_VALUES,
    description:
      'Filter by user status (élève: registered, accompanied, deactivated — staff: active, deactivated).',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsIn([...USER_ACCOUNT_STATUS_VALUES], { each: true })
  statuses?: string[];

  @ApiPropertyOptional({ description: 'Filter by establishment ID' })
  @IsOptional()
  @IsUUID('4')
  establishmentId?: string;

  @ApiPropertyOptional({ description: 'Filter coordinators by their manager (managedById)' })
  @IsOptional()
  @IsUUID('4')
  managedById?: string;

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

  @ApiPropertyOptional({
    isArray: true,
    description: 'Filter by subject IDs (for tutors)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds?: string[];

  @ApiPropertyOptional({
    isArray: true,
    description: 'Filter by level IDs (for students)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  levelIds?: string[];

  @ApiPropertyOptional({
    isArray: true,
    description: 'Filter by school class IDs (user_profiles.school_class_id)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  classIds?: string[];

  @ApiPropertyOptional({
    isArray: true,
    description: 'Filter by specialty IDs (user_profile_specialties.specialty_id)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  specialtyIds?: string[];

  @ApiPropertyOptional({
    isArray: true,
    description: 'Filter by role codes (e.g., admin, coordinator, manager)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  roleCodes?: string[];

  @ApiPropertyOptional({ description: 'Filter users from this date (createdAt)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter users until this date (createdAt)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description:
      'When true/1: users with tutor/volunteer role use the tutor-scoped student list (assigned / linked students), even if they also have staff roles (e.g. coordinator). Ignored when the user has no tutor/volunteer role. Query string e.g. tutorStudentList=true.',
    enum: ['true', 'false', '1', '0'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined;
    const v = Array.isArray(value) ? value[value.length - 1] : value;
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return v === 1 ? 'true' : v === 0 ? 'false' : undefined;
    if (typeof v !== 'string') return undefined;
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return 'true';
    if (s === 'false' || s === '0') return 'false';
    return undefined;
  })
  @IsIn(['true', 'false', '1', '0'])
  tutorStudentList?: string;

  @ApiPropertyOptional({
    description: 'Availability day of week (0=Sunday .. 6=Saturday)',
    example: 1,
  })
  @ValidateIf(
    (o) =>
      o.availabilityDayOfWeek !== undefined ||
      o.availabilityStartTime !== undefined ||
      o.availabilityEndTime !== undefined,
  )
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(0)
  @Max(6)
  availabilityDayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Availability start time in local company timezone (HH:mm)',
    example: '09:00',
  })
  @ValidateIf(
    (o) =>
      o.availabilityDayOfWeek !== undefined ||
      o.availabilityStartTime !== undefined ||
      o.availabilityEndTime !== undefined,
  )
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  availabilityStartTime?: string;

  @ApiPropertyOptional({
    description: 'Availability end time in local company timezone (HH:mm)',
    example: '17:00',
  })
  @ValidateIf(
    (o) =>
      o.availabilityDayOfWeek !== undefined ||
      o.availabilityStartTime !== undefined ||
      o.availabilityEndTime !== undefined,
  )
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  availabilityEndTime?: string;

  @ApiPropertyOptional({
    isArray: true,
    description:
      'Filter users with at least one weekly availability slot on any of these days (0=Sunday .. 6=Saturday). OR semantics; ignored when availabilityDayOfWeek + times are all set.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value.map((v) => Number(v));
    return [Number(value)];
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  availabilityDays?: number[];

  @ApiPropertyOptional({
    isArray: true,
    description:
      'Filter volunteers by VSC report frequency flags on user profile (daily and/or weekly). OR semantics within group.',
    enum: ['daily', 'weekly'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    return [value];
  })
  @IsArray()
  @IsIn(['daily', 'weekly'], { each: true })
  vscFrequencies?: ('daily' | 'weekly')[];

  @ApiPropertyOptional({
    description: 'Filter by students who are minors (true) or adults (false)',
    example: true,
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
    return undefined;
  })
  @IsBoolean()
  isMinor?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by students with special needs (true) or without (false)',
    example: true,
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
    return undefined;
  })
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @ApiPropertyOptional({ description: 'Filter students whose deactivation date is on or after this date (ISO 8601)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  exitDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter students whose deactivation date is on or before this date (ISO 8601)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  exitDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter students by deactivation reason (partial match)', example: 'Fin de suivi' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  exitReason?: string;

  @ApiPropertyOptional({ description: 'Filter tutors/volunteers whose engagement start date is on or after this date (ISO 8601)', example: '2025-09-01' })
  @IsOptional()
  @IsDateString()
  engagementStartDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter tutors/volunteers whose engagement start date is on or before this date (ISO 8601)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  engagementStartDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter tutors/volunteers whose exit date is on or after this date (ISO 8601)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  tutorExitDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter tutors/volunteers whose exit date is on or before this date (ISO 8601)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  tutorExitDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter tutors/volunteers by exit reason (partial match)', example: "Fin d'engagement anticipé" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tutorExitReason?: string;
}
