import { ApiProperty } from '@nestjs/swagger';
import { ElementType, ElementWidth } from '../entities/interface-element.entity';

export class InterfaceElementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  interfaceName: string;

  @ApiProperty()
  elementId: string;

  @ApiProperty({ enum: ['stat_card', 'table', 'chart', 'widget', 'list', 'form', 'custom', 'menu'] })
  elementType: ElementType;

  @ApiProperty()
  elementLabel: string;

  @ApiProperty({ description: 'Per-role default visibility (from role_interface_elements). NULL treated as true.', nullable: true })
  visible: boolean | null;

  @ApiProperty({ description: 'Per-role display order (from role_interface_elements). NULL = no order defined (element sorted last).', nullable: true, required: false })
  order: number | null;

  @ApiProperty({ enum: ['1/3', '1/2', '2/3', 'full', 'auto'], description: 'Per-role default width (from role_interface_elements). NULL treated as auto.', nullable: true })
  width: ElementWidth | null;

  @ApiProperty()
  config: Record<string, unknown>;

  @ApiProperty({ description: 'User customized visibility (from user preferences)', required: false })
  userVisible?: boolean;

  @ApiProperty({ description: 'User customized order (from user preferences)', required: false })
  userOrder?: number;

  @ApiProperty({ description: 'Optional group label for sidebar grouping', required: false })
  groupLabel?: string | null;

  @ApiProperty({ description: 'Optional group icon name', required: false })
  groupIcon?: string | null;

  @ApiProperty({ description: 'Display order of the group (0 = no group)', required: false })
  groupOrder?: number;

  @ApiProperty({ description: 'Parent element ID for hierarchical relationships', required: false })
  parentId?: string | null;
}
