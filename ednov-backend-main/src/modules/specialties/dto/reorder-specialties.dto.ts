import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderSpecialtiesDto {
  @ApiProperty({ type: [String], description: 'Liste ordonnée des IDs de spécialités' })
  @IsArray()
  @IsUUID('all', { each: true })
  ids!: string[];
}
