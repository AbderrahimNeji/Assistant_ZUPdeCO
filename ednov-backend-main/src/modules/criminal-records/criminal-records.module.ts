import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorCriminalRecord } from './entities/tutor-criminal-record.entity';
import { CriminalRecordsService } from './criminal-records.service';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserRole } from '../users/entities/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TutorCriminalRecord, User, UserProfile, UserRole])],
  providers: [CriminalRecordsService],
  exports: [CriminalRecordsService],
})
export class CriminalRecordsModule {}
