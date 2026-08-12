import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Specialty } from './entities/specialty.entity';
import { EstablishmentSpecialty } from './entities/establishment-specialty.entity';
import { UserProfileSpecialty } from './entities/user-profile-specialty.entity';
import { SpecialtyLevel } from './entities/specialty-level.entity';
import { Level } from '../academic/entities/level.entity';
import { SpecialtiesService } from './specialties.service';
import { SpecialtiesController } from './specialties.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Specialty, EstablishmentSpecialty, UserProfileSpecialty, SpecialtyLevel, Level])],
  controllers: [SpecialtiesController],
  providers: [SpecialtiesService],
  exports: [TypeOrmModule, SpecialtiesService],
})
export class SpecialtiesModule {}
