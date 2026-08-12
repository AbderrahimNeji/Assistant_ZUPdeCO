import { FeedbackRating } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const FEEDBACK_CATEGORIES = [
  'incorrect',
  'missing',
  'wrong_source',
  'hallucination',
  'too_long',
  'too_short',
  'slow',
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export class SubmitFeedbackDto {
  @IsString()
  messageId!: string;

  @IsEnum(FeedbackRating)
  rating!: FeedbackRating;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsIn(FEEDBACK_CATEGORIES, { each: true })
  categories?: FeedbackCategory[];
}
