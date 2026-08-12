import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { VscReportStatus, VscReportCategory } from '../entities/vsc-report.entity';

export class UpdateVscReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vscId?: string | null;

  @ApiPropertyOptional({ enum: ['daily', 'weekly'] })
  @IsOptional()
  @IsEnum(['daily', 'weekly'])
  category?: VscReportCategory | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: Date | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: Date | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  progressEvaluation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendations?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['draft', 'submitted', 'validated'])
  status?: VscReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sessionsCompleted?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sessionsClosed?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sessionsCancelled?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  assignmentsCreated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reportsSubmitted?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reportsPending?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reportsValidated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tutorHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  volunteerName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionDisplayName?: string | null;
}
