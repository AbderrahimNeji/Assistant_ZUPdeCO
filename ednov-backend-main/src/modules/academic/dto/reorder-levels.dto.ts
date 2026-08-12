import { IsArray, IsUUID } from 'class-validator';

export class ReorderLevelsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
