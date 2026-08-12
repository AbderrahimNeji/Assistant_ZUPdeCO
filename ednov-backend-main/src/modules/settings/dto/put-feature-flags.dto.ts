import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FeatureFlagItemDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ required: false, default: {} })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class PutFeatureFlagsDto {
  @ApiProperty({ type: [FeatureFlagItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureFlagItemDto)
  flags!: FeatureFlagItemDto[];
}
