import { IsUUID, IsDateString, IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckTutorConflictQueryDto {
  @ApiProperty({ description: 'Tutor user ID to check for conflicts', format: 'uuid' })
  @IsUUID('4')
  tutorId: string;

  @ApiProperty({ description: 'Session date to check (YYYY-MM-DD)', example: '2025-06-15' })
  @IsDateString()
  sessionDate: string;

  @ApiProperty({ description: 'Session start time (HH:mm)', example: '14:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ description: 'Session end time (HH:mm)', example: '16:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Session ID to exclude from conflict check (for edit mode)', format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  excludeSessionId?: string;
}
