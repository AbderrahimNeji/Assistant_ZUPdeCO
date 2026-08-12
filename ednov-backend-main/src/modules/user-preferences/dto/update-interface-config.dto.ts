import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInterfaceConfigDto {
  @ApiProperty({ description: 'Configuration object for the specific interface' })
  @IsNotEmpty()
  @IsObject()
  config: Record<string, unknown>;
}
