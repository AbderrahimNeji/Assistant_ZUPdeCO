import { IsArray, IsEnum, IsUUID, IsOptional, IsString } from 'class-validator';
import { PostItPermission } from '../entities/post-it-share.entity';

export class SharePostItDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @IsEnum(['read', 'write'])
  permission: PostItPermission;
}

export class SharePostItByRoleDto {
  @IsString()
  roleCode: string;

  @IsEnum(['read', 'write'])
  permission: PostItPermission;
}

export class UpdateSharePermissionDto {
  @IsEnum(['read', 'write'])
  permission: PostItPermission;
}
