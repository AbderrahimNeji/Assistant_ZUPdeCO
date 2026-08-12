import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: DEFAULT_PAGE, minimum: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, minimum: 1, maximum: MAX_PAGE_SIZE, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;
}

export const getPaginationDefaults = () => ({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE });
export const getMaxPageSize = () => MAX_PAGE_SIZE;

/** Compute skip (offset) for TypeORM from page and pageSize. */
export function getSkipTake(page: number = DEFAULT_PAGE, pageSize: number = DEFAULT_PAGE_SIZE): { skip: number; take: number } {
  const take = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const skip = (Math.max(1, page) - 1) * take;
  return { skip, take };
}
