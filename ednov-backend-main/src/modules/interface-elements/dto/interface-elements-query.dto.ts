import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class InterfaceElementsQueryDto {
  @ApiPropertyOptional({
    isArray: true,
    description: 'Optional establishment IDs used to pre-configure establishment-related UI filters',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  establishmentIds?: string[];
}

