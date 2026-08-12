import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class BenchmarkResultDto {
  @ApiProperty({
    example: 'What is Retrieval Augmented Generation?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({
    example: 'RAG combines retrieval with generation.',
  })
  @IsOptional()
  @IsString()
  expectedAnswer?: string;

  @ApiProperty({
    example: 'RAG retrieves relevant documents and uses them to generate answers.',
  })
  @IsString()
  @IsNotEmpty()
  generatedAnswer: string;

  @ApiProperty({
    example: 1234.56,
    description: 'Latency in milliseconds',
  })
  @IsNumber()
  latencyMs: number;

  @ApiPropertyOptional({
    example: 0.85,
    description: 'Similarity score between expected and generated answers',
  })
  @IsOptional()
  @IsNumber()
  similarity?: number;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    example: 5,
    description: 'Number of sources retrieved for this question',
  })
  @IsInt()
  @Min(0)
  retrievedSources: number;

  @ApiPropertyOptional({
    example: 'Similarity below threshold (0.5)',
  })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({
    example: 'handbook.pdf (p.2, score 0.91); faq.txt (p.1, score 0.74)',
  })
  @IsOptional()
  @IsString()
  retrievedContext?: string;
}
