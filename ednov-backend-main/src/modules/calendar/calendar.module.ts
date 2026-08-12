import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { CalendarController } from './calendar.controller';
import { CalendarAggregatorService } from './calendar-aggregator.service';
import { Session } from '../sessions/entities/session.entity';
import { PostIt } from '../post-its/entities/post-it.entity';
import { PostItShare } from '../post-its/entities/post-it-share.entity';
import { Holiday } from '../academic/entities/holiday.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Session, PostIt, PostItShare, Holiday]),
  ],
  controllers: [CalendarController],
  providers: [CalendarAggregatorService],
  exports: [CalendarAggregatorService],
})
export class CalendarModule {}
