import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, MaxLength } from 'class-validator';
import { DocumentTemplateType } from '../entities/document-template.entity';

export class UpdateDocumentTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['report', 'certificate', 'contract', 'other'])
  type?: DocumentTemplateType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateHtml?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  variables?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
