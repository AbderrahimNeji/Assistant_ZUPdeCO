import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportUsersCsvQueryDto {
  @ApiPropertyOptional({ description: 'Default profile ID applied when profileId is absent in row' })
  @IsOptional()
  @IsUUID('4')
  defaultProfileId?: string;

  @ApiPropertyOptional({ description: 'Default role ID applied when roleIds is absent in row' })
  @IsOptional()
  @IsUUID('4')
  defaultRoleId?: string;

  @ApiPropertyOptional({ description: 'Validate and parse only, no insert', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  dryRun?: boolean;
}
