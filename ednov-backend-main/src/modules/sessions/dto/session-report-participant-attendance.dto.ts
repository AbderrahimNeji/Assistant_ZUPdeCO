import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { AttendanceStatus } from '../entities/session-participant.entity';

export class SessionReportParticipantAttendanceItemDto {
  @ApiProperty()
  @IsUUID()
  participantId!: string;

  @ApiProperty({ enum: ['present', 'absent', 'excused', 'pending'] })
  @IsEnum(['present', 'absent', 'excused', 'pending'])
  attendanceStatus!: AttendanceStatus;

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
}
