import { ApiProperty } from '@nestjs/swagger';

/** System level badge metadata (niveaux 1–3); exposed on GET /gamification/me and leaderboard entries. */
export class LevelBadgeDto {
  @ApiProperty({ example: 'LEVEL_TIER_BRONZE' })
  code: string;

  @ApiProperty({ enum: ['bronze', 'silver', 'gold'] })
  tier: 'bronze' | 'silver' | 'gold';

  @ApiProperty({ example: 'Bronze', description: 'French display label' })
  displayLabel: string;

  @ApiProperty({ example: 'bronze' })
  theme: string;

  @ApiProperty({ example: 1 })
  niveauNumero: number;
}
