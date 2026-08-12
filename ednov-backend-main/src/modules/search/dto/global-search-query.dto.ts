import { IsString, IsOptional, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GlobalSearchQueryDto {
  @ApiProperty({
    description: 'Search query (minimum 2 characters)',
    example: 'John',
    minLength: 2,
  })
  @IsString()
  q: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Page size (max 5)',
    example: 5,
    default: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  pageSize?: number = 5;
}
