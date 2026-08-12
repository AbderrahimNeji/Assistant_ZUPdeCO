import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator';
import { PostItThematic, PostItColor, PostItStatus } from '../entities/post-it.entity';

export class UpdatePostItDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsEnum(['seances', 'matching', 'tuteur', 'eleves', 'etablissements', 'administration', 'autres'])
  thematic?: PostItThematic;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @IsEnum(['en_cours', 'depasse', 'done'])
  status?: PostItStatus;

  @IsOptional()
  @IsEnum(['jaune', 'orange', 'rose', 'vert', 'violet', 'bleu', 'turquoise', 'blanc-casse'])
  color?: PostItColor;

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
