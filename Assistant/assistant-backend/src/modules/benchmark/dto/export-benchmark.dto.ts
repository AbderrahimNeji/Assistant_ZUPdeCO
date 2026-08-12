import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ExportBenchmarkDto {
  @ApiPropertyOptional({
    enum: ['json', 'csv', 'pdf'],
    default: 'json',
  })
  @IsOptional()
  @IsIn(['json', 'csv', 'pdf'])
  format?: 'json' | 'csv' | 'pdf' = 'json';
}
