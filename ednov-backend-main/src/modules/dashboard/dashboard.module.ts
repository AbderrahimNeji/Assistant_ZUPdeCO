import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Session } from '../sessions/entities/session.entity';
import { SessionReport } from '../sessions/entities/session-report.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { VscReport } from '../sessions/entities/vsc-report.entity';
import { User } from '../users/entities/user.entity';
import { Establishment } from '../companies/entities/establishment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      SessionReport,
      SessionParticipant,
      VscReport,
      User,
      Establishment,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
