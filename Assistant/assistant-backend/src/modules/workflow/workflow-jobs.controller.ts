import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BackgroundWorkflowService } from './background-workflow.service';

type AuthedRequest = ExpressRequest & { user: { id: string } };

@ApiTags('Workflow Jobs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('workflow/jobs')
export class WorkflowJobsController {
  constructor(private readonly jobs: BackgroundWorkflowService) {}

  @Get()
  @ApiOperation({
    summary: 'List background workflow jobs for the current user',
  })
  @ApiQuery({ name: 'conversationId', required: false })
  async list(
    @Req() req: AuthedRequest,
    @Query('conversationId') conversationId?: string,
  ) {
    const rows = await this.jobs.listForUser(req.user.id, conversationId);
    return {
      success: true,
      jobs: rows.map(serializeJob),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a background workflow job' })
  async get(@Req() req: AuthedRequest, @Param('id') id: string) {
    const job = await this.jobs.getForUser(id, req.user.id);
    return { success: true, job: serializeJob(job) };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a queued or running workflow job' })
  async cancel(@Req() req: AuthedRequest, @Param('id') id: string) {
    const job = await this.jobs.cancel(id, req.user.id);
    return { success: true, job: serializeJob(job) };
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed or cancelled workflow job' })
  async retry(@Req() req: AuthedRequest, @Param('id') id: string) {
    const job = await this.jobs.retry(id, req.user.id);
    return { success: true, job: serializeJob(job) };
  }
}

function serializeJob(job: {
  id: string;
  workflowId: string;
  workflowName: string | null;
  message: string;
  status: string;
  progress: unknown;
  currentStep: string | null;
  error: string | null;
  resultAnswer: string | null;
  confirmationId: string | null;
  resultMessageId: string | null;
  executionTraceId: string | null;
  executionMode: string;
  queueTimeMs: number | null;
  resumeCount: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  queuedAt: Date;
  conversationId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: job.id,
    workflowId: job.workflowId,
    workflowName: job.workflowName,
    message: job.message,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    error: job.error,
    resultAnswer: job.resultAnswer,
    confirmationId: job.confirmationId,
    resultMessageId: job.resultMessageId,
    executionTraceId: job.executionTraceId,
    executionMode: job.executionMode,
    queueTimeMs: job.queueTimeMs,
    resumeCount: job.resumeCount,
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    queuedAt: job.queuedAt.toISOString(),
    conversationId: job.conversationId,
    userId: job.userId,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
