import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength, IsIn } from 'class-validator';

export class CreateMediaAssetDto {
  @ApiProperty({ enum: ['logo', 'icon', 'banner', 'document', 'email_template'] })
  @IsString()
  @IsIn(['logo', 'icon', 'banner', 'document', 'email_template'])
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @ApiProperty()
  @IsUrl()
  @MaxLength(500)
  fileUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fileType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileSize?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
