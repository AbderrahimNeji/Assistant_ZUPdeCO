import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SearchDocumentDto {
  @ApiProperty({
    example: 'What is the objective of this assistant?',
  })
  @IsString()
  question: string;
}