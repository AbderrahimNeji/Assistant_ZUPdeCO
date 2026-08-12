import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { SubjectStatus } from '../entities/subject.entity';

export class CreateSubjectDto {
  @ApiProperty({ example: 'MATH' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Mathématiques' })
  @IsString()
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  educationCycle?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCore?: boolean;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: SubjectStatus;
}
