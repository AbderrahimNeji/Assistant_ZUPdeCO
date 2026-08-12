import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateSchoolClassDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  establishmentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  schoolYearId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  levelId!: string;

  @ApiProperty({ example: '2nde 3' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  studentCount?: number;
}
