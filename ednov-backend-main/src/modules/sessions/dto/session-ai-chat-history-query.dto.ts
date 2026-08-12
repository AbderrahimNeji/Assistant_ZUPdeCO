import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SessionAiChatHistoryQueryDto {
  @ApiProperty({ description: 'Session UUID' })
  @IsUUID('all')
  sessionId!: string;
}
