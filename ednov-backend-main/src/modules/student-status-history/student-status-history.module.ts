import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentStatusHistory } from './entities/student-status-history.entity';
import { StudentStatusHistoryService } from './student-status-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudentStatusHistory])],
  providers: [StudentStatusHistoryService],
  exports: [TypeOrmModule, StudentStatusHistoryService],
})
export class StudentStatusHistoryModule {}
