import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactFunctionDto {
  @ApiProperty({ example: 'Direction', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;
}

export class UpdateContactFunctionDto {
  @ApiPropertyOptional({ example: 'Direction', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class ContactFunctionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  companyId: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty({ example: 0 })
  usageCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
