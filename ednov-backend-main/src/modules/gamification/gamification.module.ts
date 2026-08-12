import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationNiveau } from './entities/gamification-niveau.entity';
import { GamificationBadge } from './entities/gamification-badge.entity';
import { GamificationBadgeCondition } from './entities/gamification-badge-condition.entity';
import { GamificationXpRegle } from './entities/gamification-xp-regle.entity';
import { TutorGamification } from './entities/tutor-gamification.entity';
import { GamificationXpLog } from './entities/gamification-xp-log.entity';
import { GamificationUserBadge } from './entities/gamification-user-badge.entity';
import { GamificationChallenge } from './entities/gamification-challenge.entity';
import { GamificationChallengeProgress } from './entities/gamification-challenge-progress.entity';
import { User } from '../users/entities/user.entity';
import { GamificationService } from './gamification.service';
import { GamificationAdminController } from './gamification-admin.controller';
import { GamificationController } from './gamification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GamificationNiveau,
      GamificationBadge,
      GamificationBadgeCondition,
      GamificationXpRegle,
      TutorGamification,
      GamificationXpLog,
      GamificationUserBadge,
      GamificationChallenge,
      GamificationChallengeProgress,
      User,
    ]),
  ],
  controllers: [GamificationAdminController, GamificationController],
  providers: [GamificationService],
  exports: [TypeOrmModule, GamificationService],
})
export class GamificationModule {}
