import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateGamificationNiveauDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  numero: number;

  @ApiProperty()
  @IsString()
  nom: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  xpRequis: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couleur?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
