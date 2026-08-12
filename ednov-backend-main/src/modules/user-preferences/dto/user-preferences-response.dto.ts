import { ApiProperty } from '@nestjs/swagger';
import { InterfaceConfig } from '../entities/user-interface-preference.entity';

export class UserPreferencesResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  isDarkMode: boolean;

  @ApiProperty()
  interfaceConfigs: InterfaceConfig;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
