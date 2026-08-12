import { Module, OnModuleInit } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { ActionsModule } from '../actions/actions.module';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { BackgroundWorkflowService } from './background-workflow.service';
import { compareBenchmarkWorkflow } from './definitions/compare-benchmark.workflow';
import { enrollCourseWorkflow } from './definitions/enroll-course.workflow';
import { prepareCourseWorkflow } from './definitions/prepare-course.workflow';
import { WorkflowEngineService } from './workflow.engine';
import { WorkflowJobsController } from './workflow-jobs.controller';
import { WorkflowRegistry } from './workflow.registry';
import { WorkflowRunStore } from './workflow-run.store';

@Module({
  imports: [PrismaModule, AuthModule, ActionsModule, LlmModule, MemoryModule],
  controllers: [WorkflowJobsController],
  providers: [
    WorkflowRegistry,
    WorkflowRunStore,
    WorkflowEngineService,
    BackgroundWorkflowService,
  ],
  exports: [WorkflowEngineService, WorkflowRegistry, BackgroundWorkflowService],
})
export class WorkflowModule implements OnModuleInit {
  constructor(private readonly registry: WorkflowRegistry) {}

  onModuleInit() {
    // Register built-in workflows — add more by defining + register().
    this.registry.register(enrollCourseWorkflow);
    this.registry.register(prepareCourseWorkflow);
    this.registry.register(compareBenchmarkWorkflow);
  }
}
