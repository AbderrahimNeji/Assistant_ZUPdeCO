import { PartialType } from '@nestjs/swagger';
import { CreateGamificationBadgeDto } from './create-gamification-badge.dto';

export class UpdateGamificationBadgeDto extends PartialType(CreateGamificationBadgeDto) {}
