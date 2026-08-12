import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { AttendanceStatus } from '../entities/session-participant.entity';

export class UpdateSessionParticipantDto {
  @ApiPropertyOptional({ enum: ['present', 'absent', 'excused', 'pending'] })
  @IsOptional()
  @IsEnum(['present', 'absent', 'excused', 'pending'])
  attendanceStatus?: AttendanceStatus;

  @ApiPropertyOptional({ description: "Justification d'absence (optionnel)" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  absenceJustification?: string | null;

  @ApiPropertyOptional({ description: "Commentaire d'absence (optionnel)" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  absenceComment?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  matchedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
