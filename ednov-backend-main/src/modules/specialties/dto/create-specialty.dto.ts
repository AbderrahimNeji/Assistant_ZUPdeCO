import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsArray, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSpecialtyDto {
  @ApiProperty({ example: 'mathematiques' })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Mathématiques' })
  @IsString()
  @MaxLength(255)
  label!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'IDs des niveaux lycée associés' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  levelIds?: string[];
}
