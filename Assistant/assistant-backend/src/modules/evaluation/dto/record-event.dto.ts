import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordEvaluationEventDto {
  @IsString()
  @MaxLength(64)
  type!: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
