import { Controller, Get, Query, Request, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CacheTTL } from '@nestjs/cache-manager';
import { UserAwareCacheInterceptor } from '../../common/cache/user-aware-cache.interceptor';
import { DashboardService } from './dashboard.service';
import { DashboardStatsQueryDto } from './dto/dashboard-stats-query.dto';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import { LinkedElement } from '../../common/visibility/linked-element.decorator';
import { VisibilityScope } from '../../common/visibility/visibility-scope.types';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
  visibilityScope?: VisibilityScope | null;
}

@ApiTags('Dashboard')
@ApiBearerAuth('Firebase')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @LinkedElement('menu-sessions', 'sidebar')
  @UseInterceptors(UserAwareCacheInterceptor)
  @CacheTTL(300000)
  @ApiOperation({ summary: 'Get dashboard statistics (cached 5 min, key includes userId)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics with real-time data',
    type: DashboardStatsResponseDto,
  })
  async getDashboardStats(
    @Query() query: DashboardStatsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<DashboardStatsResponseDto> {
    return this.dashboardService.getDashboardStats(
      req.user.company_id,
      query,
      req.user.uid,
      req.visibilityScope,
    );
  }

  @Get('charts')
  @UseInterceptors(UserAwareCacheInterceptor)
  @CacheTTL(300000)
  @ApiOperation({ summary: 'Get dashboard charts data by establishment (cached for 5 minutes)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard charts grouped by establishment',
  })
  async getDashboardCharts(
    @Query() query: DashboardStatsQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.dashboardService.getDashboardCharts(req.user.company_id, query);
  }
}
