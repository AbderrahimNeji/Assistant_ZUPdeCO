import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, MaxLength, Min } from 'class-validator';

export class CreateRoleGroupDto {
  @ApiProperty({ example: 'admins', description: 'Stable machine-readable code' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Administrateurs' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({ description: 'Lucide icon name (e.g. Shield)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: 'CSS color or palette token' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ enum: ['in_person', 'remote', 'hybrid'] })
  @IsOptional()
  @IsEnum(['in_person', 'remote', 'hybrid'])
  mode?: 'in_person' | 'remote' | 'hybrid';

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRoleGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ enum: ['in_person', 'remote', 'hybrid'] })
  @IsOptional()
  @IsEnum(['in_person', 'remote', 'hybrid'])
  mode?: 'in_person' | 'remote' | 'hybrid';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
