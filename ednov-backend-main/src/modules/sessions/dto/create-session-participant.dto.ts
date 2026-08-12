import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { ParticipantRole, AttendanceStatus } from '../entities/session-participant.entity';

export class CreateSessionParticipantDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ['volunteer', 'student'] })
  @IsEnum(['volunteer', 'student'])
  role!: ParticipantRole;

  @ApiPropertyOptional({ enum: ['present', 'absent', 'excused', 'pending'], default: 'pending' })
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
