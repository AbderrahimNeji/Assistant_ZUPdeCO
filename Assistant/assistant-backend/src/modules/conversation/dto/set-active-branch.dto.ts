import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class SetActiveBranchDto {
  @ApiPropertyOptional({
    description: 'Activate this branch lineage (leaf resolved automatically).',
  })
  @ValidateIf((body: SetActiveBranchDto) => !body.leafMessageId)
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description:
      'Activate the path ending at this message (version / branch switch).',
  })
  @ValidateIf((body: SetActiveBranchDto) => !body.branchId)
  @IsOptional()
  @IsString()
  leafMessageId?: string;
}
