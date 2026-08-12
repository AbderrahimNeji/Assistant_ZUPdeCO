import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/** PATCH body must not include interface bindings (use PUT .../interface-elements). */
export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['interfaceBindings', 'cloneInterfaceBindingsFromRoleId'] as const),
) {}
