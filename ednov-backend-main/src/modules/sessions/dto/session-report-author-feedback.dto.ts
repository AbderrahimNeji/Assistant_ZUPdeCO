import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
  MaxLength,
} from 'class-validator';
import { SESSION_REPORT_FEELING_VALUES, type SessionReportFeeling } from '../session-report-feeling';

export class SessionReportAuthorFeedbackDto {
  @ApiProperty({ description: 'User id of the tutor/volunteer author' })
  @IsUUID()
  idAuteur!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string | null;

  @ApiPropertyOptional({ enum: [...SESSION_REPORT_FEELING_VALUES] })
  @IsOptional()
  @IsIn([...SESSION_REPORT_FEELING_VALUES])
  feeling?: SessionReportFeeling | null;
}
