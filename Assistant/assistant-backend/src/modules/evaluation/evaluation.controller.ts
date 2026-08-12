import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EvaluationFlagStatus, UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { MetricsRangeQueryDto } from './dto/metrics-range.query.dto';
import { RecordEvaluationEventDto } from './dto/record-event.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FeedbackService } from './feedback.service';
import { MetricsQueryService } from './metrics-query.service';
import { EvaluationQaService } from './qa/evaluation-qa.service';

type AuthedRequest = {
  user: { id: string };
};

@ApiTags('Evaluation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('evaluation')
export class EvaluationController {
  constructor(
    private readonly feedback: FeedbackService,
    private readonly metrics: MetricsQueryService,
    private readonly qa: EvaluationQaService,
  ) {}

  @Post('feedback')
  @ApiOperation({
    summary: 'Submit helpful / not-helpful feedback for a message',
  })
  submitFeedback(
    @Request() req: AuthedRequest,
    @Body() body: SubmitFeedbackDto,
  ) {
    return this.feedback.submitFeedback({
      userId: req.user.id,
      messageId: body.messageId,
      rating: body.rating,
      comment: body.comment,
      categories: body.categories,
    });
  }

  @Get('feedback/conversation/:conversationId')
  @ApiOperation({ summary: 'List current user feedback for a conversation' })
  listConversationFeedback(
    @Request() req: AuthedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.feedback.listForConversation(req.user.id, conversationId);
  }

  @Post('events')
  @ApiOperation({
    summary:
      'Record a safe interaction event (suggestion click, tool action, …)',
  })
  recordEvent(
    @Request() req: AuthedRequest,
    @Body() body: RecordEvaluationEventDto,
  ) {
    return this.feedback.recordEvent({
      userId: req.user.id,
      type: body.type,
      messageId: body.messageId,
      conversationId: body.conversationId,
      payload: body.payload,
    });
  }

  // ——— Admin dashboard APIs ———

  @Get('admin/metrics/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Overall quality metrics (admin)' })
  overview(@Query() query: MetricsRangeQueryDto) {
    return this.metrics.overview({ from: query.from, to: query.to });
  }

  @Get('admin/metrics/by-day')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Metrics grouped by day (admin)' })
  byDay(@Query() query: MetricsRangeQueryDto) {
    return this.metrics.byDay({ from: query.from, to: query.to });
  }

  @Get('admin/metrics/by-tool')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Metrics by tool (admin)' })
  byTool(@Query() query: MetricsRangeQueryDto) {
    return this.metrics.byTool({ from: query.from, to: query.to });
  }

  @Get('admin/metrics/by-planner-mode')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Metrics by planner mode (admin)' })
  byPlannerMode(@Query() query: MetricsRangeQueryDto) {
    return this.metrics.byPlannerMode({ from: query.from, to: query.to });
  }

  @Get('admin/feedback/summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Feedback summary (admin)' })
  feedbackSummary(@Query() query: MetricsRangeQueryDto) {
    return this.metrics.feedbackSummary({ from: query.from, to: query.to });
  }

  @Get('admin/tools/failures')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Most common failed tools (admin)' })
  failedTools(@Query() query: MetricsRangeQueryDto) {
    return this.metrics.failedTools({ from: query.from, to: query.to });
  }

  @Get('admin/feedback/comments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Most common user feedback comments (admin)' })
  commonComments(@Query() query: MetricsRangeQueryDto) {
    return this.metrics.commonComments({ from: query.from, to: query.to });
  }

  @Get('admin/flags')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Open / all evaluation flags for review (admin)' })
  flags(@Query('status') status?: EvaluationFlagStatus) {
    return this.metrics.listFlags(status);
  }

  @Get('admin/metrics/dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Dashboard-friendly aggregate (chat volume, latencies, errors, planner, feedback)',
  })
  async dashboard(@Query() query: MetricsRangeQueryDto) {
    return this.metrics.dashboard({ from: query.from, to: query.to });
  }

  @Get('qa/runs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List evaluation QA runs' })
  listQaRuns() {
    return this.qa.listRuns();
  }

  @Get('qa/runs/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get evaluation QA run detail' })
  getQaRun(@Param('id') id: string) {
    return this.qa.getRun(id);
  }

  @Post('qa/runs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Store a functional/business/hybrid QA run' })
  createQaRun(
    @Request() req: AuthedRequest,
    @Body()
    body: {
      name: string;
      dataset?: string;
      mode?: string;
      cases: Array<{
        question: string;
        expectedAnswer?: string;
        actualAnswer?: string;
        sources?: unknown;
        scores?: unknown;
        latencyMs?: number;
        passed?: boolean;
        notes?: string;
      }>;
    },
  ) {
    return this.qa.createRun({
      ...body,
      userId: req.user.id,
    });
  }

  @Post('qa/seed')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Seed a placeholder QA run from bundled dataset JSON' })
  seedQa(@Request() req: AuthedRequest) {
    return this.qa.seedPlaceholderRun(req.user.id);
  }
}
