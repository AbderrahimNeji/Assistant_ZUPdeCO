import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  IsArray,
  IsUUID,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ROLE_GROUPS, type RoleGroup } from '../role-groups';
import { RoleInterfaceBindingItemDto } from './role-interface-binding-item.dto';

export class CreateRoleDto {
  @ApiProperty({ example: 'VOLUNTEER' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Volunteer' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({
    enum: ROLE_GROUPS,
    description:
      'Logical role bucket. If omitted, inferred from `code` for known codes (admin→admins, coordinator/manager→steering, volunteer→volunteers, tutor→tutors, student→students); otherwise `other`.',
  })
  @IsOptional()
  @IsIn([...ROLE_GROUPS])
  roleGroup?: RoleGroup;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ description: 'JSON permissions map', example: { sessions: ['read', 'write'] } })
  @IsOptional()
  permissions?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Hierarchical level within the role group (1 = highest). Multiple roles can share the same level.' })
  @IsOptional()
  hierarchyLevel?: number;

  @ApiPropertyOptional({ description: 'Lucide icon name for UI display (e.g. Shield, Users, GraduationCap)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Color value for UI display (CSS color or palette token)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ enum: ['in_person', 'remote', 'hybrid'], description: 'Operation mode (null = all modes)' })
  @IsOptional()
  @IsEnum(['in_person', 'remote', 'hybrid'])
  mode?: 'in_person' | 'remote' | 'hybrid';

  @ApiPropertyOptional({
    type: [RoleInterfaceBindingItemDto],
    description: 'Initial role_interface_elements (cannot be used with cloneInterfaceBindingsFromRoleId)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleInterfaceBindingItemDto)
  interfaceBindings?: RoleInterfaceBindingItemDto[];

  @ApiPropertyOptional({
    description: 'Copy all interface bindings from this role (same company). Mutually exclusive with interfaceBindings.',
  })
  @IsOptional()
  @IsUUID()
  cloneInterfaceBindingsFromRoleId?: string;
}
