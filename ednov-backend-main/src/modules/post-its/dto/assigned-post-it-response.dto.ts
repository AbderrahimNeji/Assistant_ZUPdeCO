import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignedPostItTemplate, AssignedPostItRecurrence } from '../entities/assigned-post-it-template.entity';
import { PostItThematic, PostItColor } from '../entities/post-it.entity';
import { ScheduleConfig } from '../schedule-config.types';

export class AssignedPostItResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() companyId: string;
  @ApiProperty() createdById: string;
  @ApiProperty() createdByName: string;
  @ApiProperty() title: string;
  @ApiProperty() thematic: PostItThematic;
  @ApiProperty() content: string;
  @ApiProperty() color: PostItColor;
  @ApiProperty() isPriority: boolean;
  @ApiProperty({ type: [String] }) targetRoleIds: string[];
  @ApiPropertyOptional() recurrence: AssignedPostItRecurrence | null;
  @ApiPropertyOptional() specificDateFrom: Date | null;
  @ApiPropertyOptional() specificDateTo: Date | null;
  @ApiPropertyOptional({ type: [Number] }) quarterlyPeriods: number[] | null;
  @ApiPropertyOptional() scheduleConfig: ScheduleConfig | null;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() lastProvisionedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export function toAssignedPostItResponseDto(
  template: AssignedPostItTemplate,
  createdByName?: string,
): AssignedPostItResponseDto {
  return {
    id: template.id,
    companyId: template.companyId,
    createdById: template.createdById,
    createdByName: createdByName ?? (template.createdBy
      ? `${template.createdBy.firstName ?? ''} ${template.createdBy.lastName ?? ''}`.trim() || (template.createdBy as any).email || 'Unknown'
      : 'Unknown'),
    title: template.title,
    thematic: template.thematic,
    content: template.content,
    color: template.color,
    isPriority: template.isPriority,
    targetRoleIds: template.targetRoleIds ?? [],
    recurrence: template.recurrenceType,
    specificDateFrom: template.specificDateFrom,
    specificDateTo: template.specificDateTo,
    quarterlyPeriods: template.quarterlyPeriods ?? null,
    scheduleConfig: template.scheduleConfig ?? null,
    isActive: template.isActive,
    lastProvisionedAt: template.lastProvisionedAt,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}
