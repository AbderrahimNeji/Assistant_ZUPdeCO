import { Controller, Get, Request, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivityFeedService } from './activity-feed.service';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('activity-feed')
@ApiBearerAuth('Firebase')
@Controller('activity-feed')
export class ActivityFeedController {
  constructor(private readonly activityFeedService: ActivityFeedService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user (tutor) activity feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items (default 50, max 100)' })
  @ApiResponse({ status: 200, description: 'Chronological list of session_completed, cr_submitted, badge_awarded' })
  getMe(
    @Request() req: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.activityFeedService.getActivityFeedForTutor(
      req.user.uid,
      req.user.company_id,
      Math.min(Math.max(1, limit), 100),
    );
  }
}
