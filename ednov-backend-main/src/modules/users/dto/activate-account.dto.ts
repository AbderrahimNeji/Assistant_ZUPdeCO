import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateAccountDto {
  @ApiProperty({ description: 'Activation JWT received by email (mode=activate&token=...)' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New account password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
