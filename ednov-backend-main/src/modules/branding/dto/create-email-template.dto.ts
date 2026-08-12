import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty({ example: 'welcome' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyHtml?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyText?: string | null;

  @ApiPropertyOptional({ default: [] })
  @IsOptional()
  @IsArray()
  variables?: unknown[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
