import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsIn, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { USER_ACCOUNT_STATUS_VALUES, type UserStatus } from '../user-status';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: USER_ACCOUNT_STATUS_VALUES,
    description: 'Filter by user status',
  })
  @IsOptional()
  @IsIn([...USER_ACCOUNT_STATUS_VALUES])
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Search in first name, last name, email, display name (alias: search)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ description: 'Alias for q — search in first name, last name, email, display name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter users that have this role' })
  @IsOptional()
  @IsUUID('4')
  roleId?: string;

  @ApiPropertyOptional({ 
    description: 'Comma-separated list of user IDs to exclude from results',
    example: 'uuid1,uuid2,uuid3'
  })
  @IsOptional()
  @IsString()
  excludeIds?: string;
}
