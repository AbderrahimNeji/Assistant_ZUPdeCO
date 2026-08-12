import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { VisibilityScopeDto } from './visibility-scope.dto';

/**
 * One row in `role_interface_elements`.
 * `elementId` is the UUID primary key of `interface_elements`.
 *
 * Access model: presence of a row = access granted.
 * The `visible` and `order` columns are managed via visibilityScope / display config.
 * Fields canView, canEdit, canCustomize have been removed from the DB schema
 * (migration 1744600000000-PresenceModelRemoveCanColumns) — do NOT reintroduce them.
 */
export class RoleInterfaceBindingItemDto {
  @ApiProperty({ format: 'uuid', description: 'interface_elements.id' })
  @IsUUID()
  elementId: string;

  @ApiPropertyOptional({ type: VisibilityScopeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisibilityScopeDto)
  visibilityScope?: VisibilityScopeDto | null;
}
