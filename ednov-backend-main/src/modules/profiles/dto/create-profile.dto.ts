import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileCategory, ProfileStatus } from '../entities/profile.entity';

export class CreateProfileDto {
  @ApiProperty({ example: 'STUDENT' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Student' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['admin', 'volunteer', 'student', 'coordinator'] })
  @IsEnum(['admin', 'volunteer', 'student', 'coordinator'])
  category: ProfileCategory;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: ProfileStatus;

  @ApiPropertyOptional({ description: 'Custom JSON config for this profile' })
  @IsOptional()
  config?: Record<string, unknown>;
}
