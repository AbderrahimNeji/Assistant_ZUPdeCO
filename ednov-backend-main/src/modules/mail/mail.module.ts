import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionalMailService } from './transactional-mail.service';
import { EstablishmentCoordinator } from '../companies/entities/establishment-coordinator.entity';
import { User } from '../users/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { Company } from '../companies/entities/company.entity';
import { SessionReport } from '../sessions/entities/session-report.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      EstablishmentCoordinator,
      User,
      Session,
      SessionParticipant,
      Company,
      SessionReport,
    ]),
  ],
  providers: [TransactionalMailService],
  exports: [TransactionalMailService],
})
export class MailModule {}
