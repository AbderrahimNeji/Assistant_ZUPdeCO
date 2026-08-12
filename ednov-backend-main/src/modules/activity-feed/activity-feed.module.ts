import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../sessions/entities/session.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { SessionReport } from '../sessions/entities/session-report.entity';
import { GamificationUserBadge } from '../gamification/entities/gamification-user-badge.entity';
import { ActivityFeedService } from './activity-feed.service';
import { ActivityFeedController } from './activity-feed.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      SessionParticipant,
      SessionReport,
      GamificationUserBadge,
    ]),
  ],
  controllers: [ActivityFeedController],
  providers: [ActivityFeedService],
  exports: [ActivityFeedService],
})
export class ActivityFeedModule {}
