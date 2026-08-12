import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsObject, MaxLength } from 'class-validator';
import { ProgramStatus } from '../entities/program.entity';

export class CreateProgramDto {
  @ApiProperty({ example: 'PROG-01' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Programme Primaire' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: '2024-09-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'suspended', 'closed'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'suspended', 'closed'])
  status?: ProgramStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown> | null;
}
