import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsUUID, IsBoolean } from 'class-validator';

export class ToggleGamificationDto {
  @ApiProperty({ enum: ['niveau', 'badge', 'xp_regle'] })
  @IsString()
  @IsIn(['niveau', 'badge', 'xp_regle'])
  type: 'niveau' | 'badge' | 'xp_regle';

  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
