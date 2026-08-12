import { PartialType } from '@nestjs/swagger';
import { CreateGamificationXpRegleDto } from './create-gamification-xp-regle.dto';

export class UpdateGamificationXpRegleDto extends PartialType(CreateGamificationXpRegleDto) {}
