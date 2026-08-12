import { PartialType } from '@nestjs/swagger';
import { CreateGamificationNiveauDto } from './create-gamification-niveau.dto';

export class UpdateGamificationNiveauDto extends PartialType(CreateGamificationNiveauDto) {}
