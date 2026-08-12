import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, IsObject, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { RuleScope } from '../entities/rule.entity';

export class CreateRuleDto {
  @ApiProperty({ example: 'Max sessions per week' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: ['GLOBAL', 'COMPANY'] })
  @IsEnum(['GLOBAL', 'COMPANY'])
  scope!: RuleScope;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority!: number;

  @ApiPropertyOptional({ default: {} })
  @IsOptional()
  @IsObject()
  criteria?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowCompanyOverride?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowUserToggle?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}
