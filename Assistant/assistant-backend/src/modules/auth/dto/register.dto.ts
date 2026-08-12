import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'Rhayem',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: 'Neji',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: 'rhayem@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
