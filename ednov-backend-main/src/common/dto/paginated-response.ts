import { ApiProperty } from '@nestjs/swagger';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return { data, total, page, pageSize };
}

/** Swagger-friendly generic paginated response wrapper (use in @ApiResponse). */
export class PaginatedResponseDto<T = unknown> {
  @ApiProperty({ type: 'array', description: 'Page of items' })
  data: T[];

  @ApiProperty({ example: 42, description: 'Total number of items across all pages' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number (1-based)' })
  page: number;

  @ApiProperty({ example: 20, description: 'Number of items per page' })
  pageSize: number;
}
