import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

export class UploadLogoDto {
  @ApiPropertyOptional({ enum: ['light', 'dark'], description: 'Logo variant: light or dark. Omit for single logo (used for both modes).' })
  @IsOptional()
  @IsIn(['light', 'dark'])
  variant?: 'light' | 'dark';
}
