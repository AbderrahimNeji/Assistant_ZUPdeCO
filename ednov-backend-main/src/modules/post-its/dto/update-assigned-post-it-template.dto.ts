import { PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAssignedPostItTemplateDto } from './create-assigned-post-it-template.dto';

export class UpdateAssignedPostItTemplateDto extends PartialType(CreateAssignedPostItTemplateDto) {
  @ApiPropertyOptional({ description: 'Activate or deactivate the template' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkUpdateAssignedPostItTemplateDto {
  @ApiProperty({ description: 'IDs of templates to update', type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  ids: string[];

  @ApiProperty({ description: 'Fields to apply to all selected templates' })
  data: UpdateAssignedPostItTemplateDto;
}

export class BulkUpdateResultDto {
  @ApiProperty({ description: 'Number of templates successfully updated' })
  updated: number;

  @ApiProperty({ description: 'IDs that were not found or do not belong to the company', type: [String] })
  notFound: string[];
}
