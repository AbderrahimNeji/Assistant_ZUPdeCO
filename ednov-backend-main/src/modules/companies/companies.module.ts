import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Establishment } from './entities/establishment.entity';
import { EstablishmentCoordinator } from './entities/establishment-coordinator.entity';
import { Room } from './entities/room.entity';
import { ContactFunction } from './entities/contact-function.entity';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { ContactFunctionsService } from './contact-functions.service';
import { ContactFunctionsController } from './contact-functions.controller';
import { AuditModule } from '../audit/audit.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthModule } from '../../auth/auth.module';
import { SpecialtiesModule } from '../specialties/specialties.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      Establishment,
      EstablishmentCoordinator,
      Room,
      ContactFunction,
      Session,
      User,
      UserRole,
      SchoolClass,
    ]),
    AuditModule,
    SessionsModule,
    AuthModule,
    SpecialtiesModule,
  ],
  controllers: [CompaniesController, ContactFunctionsController],
  providers: [CompaniesService, ContactFunctionsService],
  exports: [TypeOrmModule, CompaniesService, ContactFunctionsService],
})
export class CompaniesModule {}
