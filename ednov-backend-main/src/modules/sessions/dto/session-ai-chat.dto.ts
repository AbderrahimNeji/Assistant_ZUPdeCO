import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, ValidateNested, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class SessionAiChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  content!: string;
}

export class SessionAiChatDto {
  @ApiProperty({ description: 'Session UUID (v3, v4 or v5)' })
  @IsUUID('all')
  sessionId!: string;

  @ApiProperty({
    type: [SessionAiChatMessageDto],
    description: 'Conversation messages (user and assistant)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionAiChatMessageDto)
  messages!: SessionAiChatMessageDto[];
}
