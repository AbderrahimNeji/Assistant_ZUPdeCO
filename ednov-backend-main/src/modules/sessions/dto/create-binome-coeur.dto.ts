import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class CreateBinomeCoeurDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  establishmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subjectId?: string | null;

  @ApiProperty()
  @IsUUID()
  studentUserId!: string;

  @ApiProperty()
  @IsUUID()
  tutorUserId!: string;
}
