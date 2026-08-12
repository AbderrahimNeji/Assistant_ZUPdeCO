import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatAttachmentDto {
  @ApiProperty({ example: 'brief.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Extracted plain text used as ephemeral conversation context',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80_000)
  text: string;
}
