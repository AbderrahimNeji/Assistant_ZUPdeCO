import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { RoleInterfaceBindingItemDto } from './role-interface-binding-item.dto';

export class ReplaceRoleInterfaceBindingsDto {
  @ApiProperty({ type: [RoleInterfaceBindingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleInterfaceBindingItemDto)
  bindings: RoleInterfaceBindingItemDto[];
}
