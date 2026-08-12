import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListCompaniesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'suspended', 'closed'], description: 'Filter by company status' })
  @IsOptional()
  @IsIn(['active', 'suspended', 'closed'])
  status?: 'active' | 'suspended' | 'closed';

  @ApiPropertyOptional({ description: 'Filter by code (exact or partial)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Search in name or code' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
