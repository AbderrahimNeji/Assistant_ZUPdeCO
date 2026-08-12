import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsBoolean, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGamificationBadgeConditionDto {
  @ApiProperty({ example: 'seances_count' })
  @IsString()
  typeCondition: string;

  @ApiProperty({ example: '>=', description: '>, >=, =, <, <=' })
  @IsString()
  operateur: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  valeur: number;
}

export class CreateGamificationBadgeDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  nom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couleur?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  xpRecompense?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateGamificationBadgeConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGamificationBadgeConditionDto)
  conditions?: CreateGamificationBadgeConditionDto[];
}
