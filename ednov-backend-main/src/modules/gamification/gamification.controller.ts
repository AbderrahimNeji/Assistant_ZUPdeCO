import { Controller, Get, Request, Query, ParseIntPipe, DefaultValuePipe, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiExtraModels,
  getSchemaPath,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../../auth/roles.decorator';
import { GamificationService } from './gamification.service';
import { LevelBadgeDto } from './dto/level-badge.dto';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('gamification')
@ApiBearerAuth('Firebase')
@ApiExtraModels(LevelBadgeDto)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user (tutor) gamification summary' })
  @ApiResponse({
    status: 200,
    description:
      'Total XP, currentNiveau, nextNiveau, progress fields, levelBadge (Bronze/Argent/Gold for niveau numero 1–3), achievement badges',
    schema: {
      type: 'object',
      properties: {
        totalXp: { type: 'number' },
        levelBadge: { oneOf: [{ $ref: getSchemaPath(LevelBadgeDto) }, { type: 'null' }] },
        currentNiveau: { type: 'object', nullable: true },
        nextNiveau: { type: 'object', nullable: true },
        badges: { type: 'array' },
      },
    },
  })
  getMe(@Request() req: AuthenticatedRequest) {
    return this.gamificationService.getTutorGamification(
      req.user.uid,
      req.user.company_id,
    );
  }

  @Get('users/:userId')
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({
    summary: 'Get gamification summary for a tutor/volunteer (staff only)',
    description:
      'Same shape as GET /gamification/me. Target user must belong to the same company and have tutor or volunteer role.',
  })
  @ApiParam({ name: 'userId', format: 'uuid', description: 'Internal user UUID' })
  @ApiResponse({
    status: 200,
    description: 'Gamification summary including levelBadge when applicable',
    schema: {
      type: 'object',
      properties: {
        totalXp: { type: 'number' },
        levelBadge: { oneOf: [{ $ref: getSchemaPath(LevelBadgeDto) }, { type: 'null' }] },
        currentNiveau: { type: 'object', nullable: true },
        nextNiveau: { type: 'object', nullable: true },
        badges: { type: 'array' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Target user is not tutor/volunteer' })
  @ApiResponse({ status: 404, description: 'User not found in company' })
  getUserGamification(
    @Request() req: AuthenticatedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.gamificationService.getTutorGamificationForStaff(req.user.company_id, userId);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get current user (tutor) XP history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items (default 50)' })
  @ApiResponse({ status: 200, description: 'List of XP log entries' })
  getMeHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.gamificationService.getTutorXpHistory(
      req.user.uid,
      req.user.company_id,
      Math.min(limit, 100),
    );
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get company leaderboard (top N + current user rank)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Top N (default 20, max 50)' })
  @ApiResponse({
    status: 200,
    description: 'entries[] and myEntry include levelBadge when niveau numero is 1–3',
    schema: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rank: { type: 'number' },
              displayName: { type: 'string' },
              totalXp: { type: 'number' },
              currentNiveau: { type: 'object', nullable: true },
              levelBadge: { oneOf: [{ $ref: getSchemaPath(LevelBadgeDto) }, { type: 'null' }] },
            },
          },
        },
        myRank: { type: 'number' },
        myEntry: { type: 'object', nullable: true },
      },
    },
  })
  getLeaderboard(
    @Request() req: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.gamificationService.getLeaderboard(
      req.user.company_id,
      req.user.uid,
      Math.min(Math.max(1, limit), 50),
    );
  }
}
