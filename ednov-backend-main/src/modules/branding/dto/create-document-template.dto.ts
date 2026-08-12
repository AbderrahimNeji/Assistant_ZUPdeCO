import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, MaxLength } from 'class-validator';
import { DocumentTemplateType } from '../entities/document-template.entity';

export class CreateDocumentTemplateDto {
  @ApiProperty({ example: 'report-v1' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @ApiPropertyOptional({ enum: ['report', 'certificate', 'contract', 'other'] })
  @IsOptional()
  @IsEnum(['report', 'certificate', 'contract', 'other'])
  type?: DocumentTemplateType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateHtml?: string | null;

  @ApiPropertyOptional({ default: [] })
  @IsOptional()
  @IsArray()
  variables?: unknown[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
