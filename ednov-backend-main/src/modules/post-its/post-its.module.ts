import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { PostItsController } from './post-its.controller';
import { PostItsService } from './post-its.service';
import { PostItSharesService } from './post-it-shares.service';
import { AssignedPostItTemplatesService } from './assigned-post-it-templates.service';
import { AssignedPostItTemplatesController } from './assigned-post-it-templates.controller';
import { AssignedPostItsController } from './assigned-post-its.controller';
import { AssignedPostItsSchedulerService } from './assigned-post-its-scheduler.service';
import { PostIt } from './entities/post-it.entity';
import { PostItShare } from './entities/post-it-share.entity';
import { AssignedPostItTemplate } from './entities/assigned-post-it-template.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { SchoolYear } from '../academic/entities/school-year.entity';
import { SchoolYearQuarter } from '../academic/entities/school-year-quarter.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([PostIt, PostItShare, AssignedPostItTemplate, User, Role, SchoolYear, SchoolYearQuarter]),
  ],
  controllers: [AssignedPostItsController, AssignedPostItTemplatesController, PostItsController],
  providers: [
    PostItsService,
    PostItSharesService,
    AssignedPostItTemplatesService,
    AssignedPostItsSchedulerService,
  ],
  exports: [PostItsService, PostItSharesService, AssignedPostItTemplatesService],
})
export class PostItsModule {}
