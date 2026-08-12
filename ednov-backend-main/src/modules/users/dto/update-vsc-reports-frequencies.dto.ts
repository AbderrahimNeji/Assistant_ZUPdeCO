import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class VscReportsFrequenciesDto {
  @ApiProperty({ description: 'Rapport journalier activé (tous les jours à 20h)' })
  @IsBoolean()
  daily!: boolean;

  @ApiProperty({ description: 'Rapport hebdomadaire activé (dimanche à 20h)' })
  @IsBoolean()
  weekly!: boolean;
}

export class UpdateVscReportsFrequenciesDto {
  @ApiProperty({ 
    description: 'Configuration des fréquences de rapports automatiques VSC',
    type: VscReportsFrequenciesDto
  })
  @IsObject()
  @ValidateNested()
  @Type(() => VscReportsFrequenciesDto)
  vscReportsFrequencies!: VscReportsFrequenciesDto;
}
