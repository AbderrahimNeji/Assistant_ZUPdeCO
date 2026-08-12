import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserEstablishment } from './entities/user-establishment.entity';
import { Role } from '../roles/entities/role.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { Company } from '../companies/entities/company.entity';
import { SessionStudentTutorPair } from '../sessions/entities/session-student-tutor-pair.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { BinomeCoeur } from '../sessions/entities/binome-coeur.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Subject } from '../academic/entities/subject.entity';
import { Session } from '../sessions/entities/session.entity';
import { InterfaceElement } from '../interface-elements/entities/interface-element.entity';
import { RoleInterfaceElement } from '../interface-elements/entities/role-interface-element.entity';
import { StudentStatusHistory } from '../student-status-history/entities/student-status-history.entity';
import { UsersService } from './users.service';
import { StudentStatusSchedulerService } from './student-status-scheduler.service';
import { InvitationService } from './invitation.service';
import { UsersVscConfigService } from './users-vsc-config.service';
import { UsersController } from './users.controller';
import { AuditModule } from '../audit/audit.module';
import { StudentStatusHistoryModule } from '../student-status-history/student-status-history.module';
import { CriminalRecordsModule } from '../criminal-records/criminal-records.module';
import { SpecialtiesModule } from '../specialties/specialties.module';
import { PostItsModule } from '../post-its/post-its.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserRole,
      UserProfile,
      UserEstablishment,
      Role,
      Profile,
      Establishment,
      Company,
      SessionStudentTutorPair,
      SessionParticipant,
      BinomeCoeur,
      SchoolClass,
      Subject,
      Session,
      InterfaceElement,
      RoleInterfaceElement,
      StudentStatusHistory,
    ]),
    AuditModule,
    StudentStatusHistoryModule,
    CriminalRecordsModule,
    SpecialtiesModule,
    PostItsModule,
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, InvitationService, UsersVscConfigService, StudentStatusSchedulerService],
  exports: [TypeOrmModule, UsersService, InvitationService, UsersVscConfigService, StudentStatusSchedulerService],
})
export class UsersModule {}
