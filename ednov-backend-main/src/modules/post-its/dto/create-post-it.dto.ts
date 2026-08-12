import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator';
import { PostItThematic, PostItColor } from '../entities/post-it.entity';

export class CreatePostItDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsEnum(['seances', 'matching', 'tuteur', 'eleves', 'etablissements', 'administration', 'autres'])
  thematic: PostItThematic;

  @IsString()
  content: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsEnum(['jaune', 'orange', 'rose', 'vert', 'violet', 'bleu', 'turquoise'])
  color?: PostItColor;

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;
}
