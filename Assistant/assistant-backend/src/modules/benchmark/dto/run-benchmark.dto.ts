import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RunBenchmarkDto {
  @ApiProperty({
    example: 'rag',
    description: 'Name of the benchmark dataset to run',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Dataset name may only contain letters, numbers, underscores, and hyphens',
  })
  dataset: string;
}
