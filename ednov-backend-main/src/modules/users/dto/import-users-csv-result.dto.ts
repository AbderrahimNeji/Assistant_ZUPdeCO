import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportUsersCsvErrorDto {
  @ApiProperty()
  rowNumber: number;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  rawRow?: Record<string, string>;
}

export class ImportUsersCsvResultDto {
  @ApiProperty()
  totalRows: number;

  @ApiProperty()
  importedCount: number;

  @ApiProperty()
  skippedExistingEmailCount: number;

  @ApiProperty()
  invalidCount: number;

  @ApiProperty({ type: [ImportUsersCsvErrorDto] })
  errors: ImportUsersCsvErrorDto[];
}
