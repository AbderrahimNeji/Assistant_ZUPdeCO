import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityType } from './entities/activity-type.entity';
import { Activity } from './entities/activity.entity';
import { ActivityTypeService } from './activity-type.service';
import { ActivityService } from './activity.service';
import { ActivityTypeController } from './activity-type.controller';
import { ActivityController } from './activity.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityType, Activity]),
    AuditModule,
  ],
  controllers: [ActivityTypeController, ActivityController],
  providers: [ActivityTypeService, ActivityService],
  exports: [TypeOrmModule, ActivityTypeService, ActivityService],
})
export class ActivityModule {}
