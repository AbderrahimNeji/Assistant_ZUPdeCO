import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';
import { GlobalSearchResponseDto } from './dto/global-search-response.dto';
import { Roles } from '../../auth/roles.decorator';

@ApiTags('search')
@Controller('search')
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @Roles('admin', 'manager', 'coordinator', 'recruiter', 'volunteer', 'tutor')
  @ApiOperation({
    summary: 'Global search across users and establishments',
    description:
      'Search for tutors, students, volunteers, admins, and establishments. Results filtered by user role and permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results paginated by category',
    type: GlobalSearchResponseDto,
  })
  async globalSearch(@Query() query: GlobalSearchQueryDto, @Req() req: any) {
    return this.searchService.globalSearch(query, req.user);
  }
}
