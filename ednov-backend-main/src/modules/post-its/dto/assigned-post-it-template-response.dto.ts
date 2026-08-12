import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignedPostItTemplate, AssignedPostItRecurrence } from '../entities/assigned-post-it-template.entity';
import { PostItThematic, PostItColor } from '../entities/post-it.entity';
import { ScheduleConfig } from '../schedule-config.types';

export class AssignedPostItTemplateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() companyId: string;
  @ApiProperty() createdById: string;
  @ApiProperty() title: string;
  @ApiProperty() thematic: PostItThematic;
  @ApiProperty() content: string;
  @ApiProperty() color: PostItColor;
  @ApiProperty() isPriority: boolean;
  @ApiPropertyOptional() targetRoleCode: string | null;
  @ApiPropertyOptional() targetUserId: string | null;
  @ApiPropertyOptional() recurrenceType: AssignedPostItRecurrence | null;
  @ApiPropertyOptional() specificDateFrom: Date | null;
  @ApiPropertyOptional() specificDateTo: Date | null;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() lastProvisionedAt: Date | null;
  @ApiPropertyOptional() scheduleConfig: ScheduleConfig | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class AssignedPostItTemplateListResponseDto {
  @ApiProperty({ type: [AssignedPostItTemplateResponseDto] })
  data: AssignedPostItTemplateResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

export function toAssignedPostItTemplateResponseDto(
  template: AssignedPostItTemplate,
): AssignedPostItTemplateResponseDto {
  return {
    id: template.id,
    companyId: template.companyId,
    createdById: template.createdById,
    title: template.title,
    thematic: template.thematic,
    content: template.content,
    color: template.color,
    isPriority: template.isPriority,
    targetRoleCode: template.targetRoleCode,
    targetUserId: template.targetUserId,
    recurrenceType: template.recurrenceType,
    specificDateFrom: template.specificDateFrom,
    specificDateTo: template.specificDateTo,
    isActive: template.isActive,
    lastProvisionedAt: template.lastProvisionedAt,
    scheduleConfig: template.scheduleConfig,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}
