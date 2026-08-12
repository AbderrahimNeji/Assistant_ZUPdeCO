import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { VisibilityScope } from '../../../common/visibility/visibility-scope.types';

/**
 * Response shape for one role_interface_elements row.
 * Access model: presence = access granted. canView/canEdit/canCustomize removed from DB.
 */
export class RoleInterfaceBindingResponseDto {
  @ApiProperty()
  bindingId: string;

  @ApiProperty({ description: 'interface_elements.id (PK)' })
  elementId: string;

  @ApiProperty({ description: 'Stable element key (e.g. menu-admins)' })
  elementKey: string;

  @ApiProperty()
  interfaceName: string;

  @ApiProperty()
  elementLabel: string;

  @ApiPropertyOptional({ description: 'Visibility scope configuration for this binding' })
  visibilityScope: VisibilityScope | null;
}
