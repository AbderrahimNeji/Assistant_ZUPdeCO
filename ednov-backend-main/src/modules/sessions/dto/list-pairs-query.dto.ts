import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsInt, Min, Max, IsUUID, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListPairsQueryDto {
  @ApiPropertyOptional({ type: [String], description: 'Assignment types to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  types?: string[];

  @ApiPropertyOptional({ description: 'Session ID to filter by' })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Tutor user ID to filter by' })
  @IsOptional()
  @IsUUID('4')
  tutorId?: string;

  @ApiPropertyOptional({ description: 'Student user ID to filter by' })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @ApiPropertyOptional({ description: 'Establishment ID to filter by' })
  @IsOptional()
  @IsUUID('4')
  establishmentId?: string;

  @ApiPropertyOptional({ description: 'Subject ID to filter by' })
  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Date from' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Tutor search term' })
  @IsOptional()
  @IsString()
  tutorSearch?: string;

  @ApiPropertyOptional({ description: 'Student search term' })
  @IsOptional()
  @IsString()
  studentSearch?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
