import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  IsObject,
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsBoolean,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SessionType, SessionFormat, SessionMode, RecurrenceType } from '../entities/session.entity';
import { SESSION_TYPES } from '../session-types.constants';
import { CreateActivityDto } from '../../activity/dto/create-activity.dto';
import { CreateActivityTypeDto } from '../../activity/dto/create-activity-type.dto';
import { StudentTutorPairDto } from './set-assignments.dto';

export class CreateSessionDto {
  @ApiProperty()
  @IsUUID()
  establishmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roomId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  programId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  schoolYearId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Level IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  levelIds?: string[];

  @ApiProperty({ example: '2024-09-15' })
  @IsDateString()
  sessionDate!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @MaxLength(10)
  startTime!: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @MaxLength(10)
  endTime!: string;

  @ApiProperty({ enum: [...SESSION_TYPES] })
  @IsEnum([...SESSION_TYPES])
  type!: SessionType;

  @ApiPropertyOptional({ enum: ['in_person', 'remote', 'hybrid'], default: 'in_person' })
  @IsOptional()
  @IsEnum(['in_person', 'remote', 'hybrid'])
  sessionFormat?: SessionFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  joinLink?: string | null;

  @ApiPropertyOptional({ enum: ['single', 'recurring'], default: 'single' })
  @IsOptional()
  @IsEnum(['single', 'recurring'])
  mode?: SessionMode;

  @ApiPropertyOptional({
    enum: ['none', 'once', 'daily', 'weekly', 'several_days_per_week', 'biweekly', 'monthly', 'ab', 'custom'],
    default: 'none',
  })
  @IsOptional()
  @IsEnum(['none', 'once', 'daily', 'weekly', 'several_days_per_week', 'biweekly', 'monthly', 'ab', 'custom'])
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  recurrenceRule?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStudents?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxVolunteers?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  activityId?: string | null;

  @ApiProperty({ type: [String], description: 'Subject IDs' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  subjectIds?: string[];

  @ApiPropertyOptional({ description: 'School class ID (optional)' })
  @IsOptional()
  @IsUUID('4')
  classId?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Specialty IDs (optional, lycée only)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specialtyIds?: string[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  establishmentName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  programName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  activityName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  roomName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topic?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ description: 'Tutor user IDs (role tutors)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tutorIds?: string[];

  @ApiPropertyOptional({ description: 'Student user IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];

  @ApiPropertyOptional({ description: 'VSC / volunteer user IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  volunteerIds?: string[];

  @ApiPropertyOptional({
    description:
      'Optional explicit tutor–student pairs. If omitted, pairs are derived as studentIds × tutorIds (supports whole_class N×M).',
    type: [StudentTutorPairDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentTutorPairDto)
  pairs?: StudentTutorPairDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @ApiPropertyOptional({
    description:
      'If false, session dates must not fall on company holidays/vacation periods. Default true.',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  planDuringHolidays?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional vacation zone (company) to filter school-vacation periods when planDuringHolidays is false.',
  })
  @IsOptional()
  @IsUUID()
  vacationZoneId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managedById?: string | null;

  @ApiPropertyOptional({
    description: 'Create new activity inline (mutually exclusive with activityId). If newActivityType is provided, activityTypeId in newActivity will be ignored.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateActivityDto)
  newActivity?: CreateActivityDto;

  @ApiPropertyOptional({
    description: 'Create new activity type inline (for newActivity). If provided, the created type ID will be used for newActivity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateActivityTypeDto)
  newActivityType?: CreateActivityTypeDto;
}
