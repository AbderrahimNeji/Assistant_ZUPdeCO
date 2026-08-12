import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckRoomCapacityQueryDto {
  @ApiProperty({ description: 'ID de la salle à vérifier' })
  @IsUUID('4')
  roomId: string;

  @ApiProperty({ description: 'Nombre de participants à ajouter', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  participantsToAdd: number;

  @ApiProperty({ example: '2026-05-10', description: 'Date de la séance (YYYY-MM-DD)' })
  @IsDateString()
  sessionDate: string;

  @ApiProperty({ example: '14:00', description: 'Heure de début (HH:mm ou HH:mm:ss)' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '16:00', description: 'Heure de fin (HH:mm ou HH:mm:ss)' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ description: 'ID de la séance à exclure (lors de la modification d\'une séance existante)' })
  @IsOptional()
  @IsUUID('4')
  excludeSessionId?: string;
}
