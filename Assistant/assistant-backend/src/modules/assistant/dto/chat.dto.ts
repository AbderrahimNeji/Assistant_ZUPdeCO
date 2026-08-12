import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { ChatAttachmentDto } from './chat-attachment.dto';

export class ChatActionDto {
  @ApiProperty({ example: 'enrollment' })
  @IsString()
  @IsNotEmpty()
  toolId: string;

  @ApiProperty({ example: 'enroll_course' })
  @IsString()
  @IsNotEmpty()
  actionId: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class ChatConfirmDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  confirmationId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  approved: boolean;
}

export class ChatDto {
  @ApiProperty({
    example: 'Hello, who are you?',
    description:
      'User message. May be empty when attachments, action, or confirm are provided.',
  })
  @ValidateIf(
    (body: ChatDto) =>
      !body.attachments?.length && !body.action && !body.confirm,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({
    example: 'clxyz123',
    description:
      'Optional conversation id. Omit to start a new conversation; provide to continue an existing one.',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    type: [ChatAttachmentDto],
    description:
      'Temporary file contents for this turn only (not indexed into the knowledge base).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];

  @ApiPropertyOptional({
    type: ChatActionDto,
    description: 'Explicit Action Engine button payload.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatActionDto)
  action?: ChatActionDto;

  @ApiPropertyOptional({
    type: ChatConfirmDto,
    description: 'Confirm or cancel a pending destructive action.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatConfirmDto)
  confirm?: ChatConfirmDto;

  @ApiPropertyOptional({
    description:
      'When true, reuse the message as a regenerate request and do not append a new user turn.',
  })
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;

  @ApiPropertyOptional({
    description:
      'User message id to edit. Creates a sibling user message on a new branch.',
  })
  @IsOptional()
  @IsString()
  editMessageId?: string;

  @ApiPropertyOptional({
    description:
      'User message id that owns assistant siblings. Required when regenerate is true.',
  })
  @IsOptional()
  @IsString()
  parentMessageId?: string;

  @ApiPropertyOptional({
    description:
      'Workflow execution mode. background queues the job and returns immediately.',
    enum: ['interactive', 'background'],
  })
  @IsOptional()
  @IsIn(['interactive', 'background'])
  executionMode?: 'interactive' | 'background';

  @ApiPropertyOptional({
    description:
      'Structured Ednov page context (route, selection, filters, entities). Used by adapters and knowledge providers; never trusted for authorization.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  applicationContext?: Record<string, unknown>;
}
