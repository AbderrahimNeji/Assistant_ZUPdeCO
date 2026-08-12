import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FirebaseJwtGuard } from '../../auth/firebase-jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { AssignedPostItTemplatesService } from './assigned-post-it-templates.service';
import { CreateAssignedPostItTemplateDto } from './dto/create-assigned-post-it-template.dto';
import { UpdateAssignedPostItTemplateDto, BulkUpdateAssignedPostItTemplateDto, BulkUpdateResultDto } from './dto/update-assigned-post-it-template.dto';
import { ListAssignedPostItTemplatesQueryDto } from './dto/list-assigned-post-it-templates-query.dto';
import {
  AssignedPostItTemplateResponseDto,
  AssignedPostItTemplateListResponseDto,
} from './dto/assigned-post-it-template-response.dto';
import {
  TrackingOccurrenceDto,
  TrackingUsersResponseDto,
  GetTrackingUsersQueryDto,
  ForceCompleteDto,
} from './dto/tracking.dto';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('post-its')
@ApiBearerAuth('Firebase')
@Controller('post-its/assigned-templates')
@UseGuards(FirebaseJwtGuard, RolesGuard)
@Roles('admin', 'ADMIN')
export class AssignedPostItTemplatesController {
  constructor(
    private readonly assignedPostItTemplatesService: AssignedPostItTemplatesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Superadmin] Create an assigned post-it template' })
  @ApiResponse({ status: 201, type: AssignedPostItTemplateResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or missing target' })
  @ApiResponse({ status: 403, description: 'Superadmin only' })
  async create(
    @Body() dto: CreateAssignedPostItTemplateDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AssignedPostItTemplateResponseDto> {
    return this.assignedPostItTemplatesService.create(dto, req.user.uid, req.user.company_id);
  }

  @Get()
  @ApiOperation({ summary: '[Superadmin] List assigned post-it templates' })
  @ApiResponse({ status: 200, type: AssignedPostItTemplateListResponseDto })
  async findAll(
    @Query() query: ListAssignedPostItTemplatesQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AssignedPostItTemplateListResponseDto> {
    return this.assignedPostItTemplatesService.findAll(req.user.company_id, query);
  }

  @Get(':id/next-occurrences')
  @ApiOperation({ summary: '[Superadmin] Get next occurrences for custom_pick mode' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'count', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of next occurrences',
    schema: {
      type: 'array',
      items: {
        properties: {
          key: { type: 'string' },
          label: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Template not found or has no schedule config' })
  async getNextOccurrences(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('count') count: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Array<{ key: string; label: string; date: Date }>> {
    return this.assignedPostItTemplatesService.getNextOccurrences(
      id,
      req.user.company_id,
      count ? Number.parseInt(count, 10) : 12,
    );
  }

  @Get(':id/tracking/occurrences')
  @ApiOperation({ summary: '[Admin] Get all occurrences with completion stats for tracking' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [TrackingOccurrenceDto] })
  async getTrackingOccurrences(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<TrackingOccurrenceDto[]> {
    return this.assignedPostItTemplatesService.getTrackingOccurrences(id, req.user.company_id);
  }

  @Get(':id/tracking/users')
  @ApiOperation({ summary: '[Admin] Get users assigned to a specific occurrence with their status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: TrackingUsersResponseDto })
  async getTrackingUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetTrackingUsersQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TrackingUsersResponseDto> {
    return this.assignedPostItTemplatesService.getTrackingUsers(
      id,
      req.user.company_id,
      query.periodKey,
      {
        status: query.status,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      },
    );
  }

  @Patch(':id/tracking/force-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Force-complete a post-it for a user (admin override)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Post-it marked as complete' })
  async forceComplete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ForceCompleteDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.assignedPostItTemplatesService.forceComplete(
      id,
      req.user.company_id,
      dto.userId,
      dto.periodKey,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '[Superadmin] Get a single assigned post-it template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: AssignedPostItTemplateResponseDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AssignedPostItTemplateResponseDto> {
    return this.assignedPostItTemplatesService.findOne(id, req.user.company_id);
  }

  @Patch('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Superadmin] Apply the same changes to multiple templates at once' })
  @ApiResponse({ status: 200, type: BulkUpdateResultDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async bulkUpdate(
    @Body() dto: BulkUpdateAssignedPostItTemplateDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<BulkUpdateResultDto> {
    return this.assignedPostItTemplatesService.bulkUpdate(dto, req.user.company_id);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Superadmin] Bulk delete assigned templates and their instances' })
  @ApiResponse({ status: 200, schema: { properties: { deleted: { type: 'number' } } } })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async bulkDelete(
    @Body() dto: { ids: string[] },
    @Request() req: AuthenticatedRequest,
  ): Promise<{ deleted: number }> {
    return this.assignedPostItTemplatesService.bulkDelete(dto.ids, req.user.company_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Superadmin] Update an assigned post-it template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: AssignedPostItTemplateResponseDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignedPostItTemplateDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AssignedPostItTemplateResponseDto> {
    return this.assignedPostItTemplatesService.update(id, dto, req.user.company_id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Superadmin] Soft-delete an assigned post-it template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.assignedPostItTemplatesService.remove(id, req.user.company_id);
  }

  @Post(':id/provision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Superadmin] Manually trigger provisioning for a template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Post-its provisioned',
    schema: { properties: { provisioned: { type: 'number' } } },
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async provision(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ provisioned: number }> {
    const provisioned = await this.assignedPostItTemplatesService.provisionById(id, req.user.company_id);
    return { provisioned };
  }

  @Post('backfill-deadlines')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Superadmin] Backfill deadlines for all assigned post-its with null deadline' })
  @ApiResponse({
    status: 200,
    description: 'Deadlines backfilled',
    schema: {
      properties: {
        updated: { type: 'number' },
        skipped: { type: 'number' },
        errors: { type: 'number' },
      },
    },
  })
  async backfillDeadlines(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ updated: number; skipped: number; errors: number }> {
    return this.assignedPostItTemplatesService.backfillDeadlines(req.user.company_id);
  }
}
