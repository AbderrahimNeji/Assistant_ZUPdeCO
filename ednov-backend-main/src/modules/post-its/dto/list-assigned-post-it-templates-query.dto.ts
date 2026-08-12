import { IsEnum, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { AssignedPostItRecurrence } from '../entities/assigned-post-it-template.entity';

export class ListAssignedPostItTemplatesQueryDto {
  @ApiPropertyOptional({ enum: ['weekly', 'monthly', 'quarterly', 'annually', 'specific_date'] })
  @IsOptional()
  @IsEnum(['weekly', 'monthly', 'quarterly', 'annually', 'specific_date'])
  recurrenceType?: AssignedPostItRecurrence;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
