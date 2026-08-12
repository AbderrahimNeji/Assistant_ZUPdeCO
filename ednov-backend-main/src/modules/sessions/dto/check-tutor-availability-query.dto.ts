import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsOptional } from 'class-validator';

export class CheckTutorAvailabilityQueryDto {
  @ApiProperty({ description: 'ID of the tutor to check' })
  @IsUUID('4')
  tutorId: string;

  @ApiProperty({ example: '2026-05-10', description: 'Session date (YYYY-MM-DD)' })
  @IsDateString()
  sessionDate: string;

  @ApiProperty({ example: '14:00', description: 'Session start time (HH:mm or HH:mm:ss)' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '16:00', description: 'Session end time (HH:mm or HH:mm:ss)' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Session ID to exclude from the check (used when editing an existing session)' })
  @IsOptional()
  @IsUUID('4')
  excludeSessionId?: string;
}
