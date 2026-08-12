import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EvaluationController } from './evaluation.controller';
import { EvaluationRecorderService } from './evaluation-recorder.service';
import { FailureDetectionService } from './failure-detection.service';
import { FeedbackService } from './feedback.service';
import { MetricsQueryService } from './metrics-query.service';
import { EvaluationQaService } from './qa/evaluation-qa.service';
import { TurnMetricsService } from './turn-metrics.service';

@Module({
  imports: [AuthModule],
  controllers: [EvaluationController],
  providers: [
    RolesGuard,
    TurnMetricsService,
    FailureDetectionService,
    FeedbackService,
    MetricsQueryService,
    EvaluationRecorderService,
    EvaluationQaService,
  ],
  exports: [
    EvaluationRecorderService,
    FeedbackService,
    MetricsQueryService,
    EvaluationQaService,
  ],
})
export class EvaluationModule {}
