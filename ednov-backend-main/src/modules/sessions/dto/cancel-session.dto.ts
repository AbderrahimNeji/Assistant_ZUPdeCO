import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export enum CancelSessionReasonCode {
  STUDENT_ABSENCE = 'STUDENT_ABSENCE',
  TUTOR_ABSENCE = 'TUTOR_ABSENCE',
  VSC_ABSENCE = 'VSC_ABSENCE',
  WEATHER = 'WEATHER',
  ROOM_UNAVAILABLE = 'ROOM_UNAVAILABLE',
  OTHER = 'OTHER',
}

export enum CancelSessionDematchMode {
  GLOBAL = 'GLOBAL',
}

export class CancelSessionDto {
  @ApiProperty({ enum: CancelSessionReasonCode, description: 'Cancellation reason code' })
  @IsEnum(CancelSessionReasonCode)
  reasonCode: CancelSessionReasonCode;

  @ApiPropertyOptional({
    description: 'Required when reasonCode is OTHER',
    maxLength: 1000,
  })
  @ValidateIf((o: CancelSessionDto) => o.reasonCode === CancelSessionReasonCode.OTHER)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reasonDetail?: string;

  @ApiPropertyOptional({
    enum: CancelSessionDematchMode,
    default: CancelSessionDematchMode.GLOBAL,
    description: 'Dematch mode is always GLOBAL for this endpoint',
  })
  @IsOptional()
  @IsEnum(CancelSessionDematchMode)
  dematchMode?: CancelSessionDematchMode;
}
