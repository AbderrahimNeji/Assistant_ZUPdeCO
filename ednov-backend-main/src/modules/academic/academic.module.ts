import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Program } from './entities/program.entity';
import { Level } from './entities/level.entity';
import { Subject } from './entities/subject.entity';
import { SchoolYear } from './entities/school-year.entity';
import { SchoolYearQuarter } from './entities/school-year-quarter.entity';
import { Holiday } from './entities/holiday.entity';
import { VacationZone } from './entities/vacation-zone.entity';
import { SchoolClass } from './entities/school-class.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { AcademicService } from './academic.service';
import { AcademicController } from './academic.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Program,
      Level,
      Subject,
      SchoolYear,
      SchoolYearQuarter,
      Holiday,
      VacationZone,
      SchoolClass,
      Establishment,
    ]),
    AuditModule,
  ],
  controllers: [AcademicController],
  providers: [AcademicService],
  exports: [TypeOrmModule, AcademicService],
})
export class AcademicModule {}
