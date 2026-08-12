import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { Roles } from '../../auth/roles.decorator';
import { LinkedElement } from '../../common/visibility/linked-element.decorator';
import { WithActionScopes } from '../../common/visibility/action-scope.decorator';
import { WriteScope } from '../../common/visibility/action-scope.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('activities')
@ApiBearerAuth('Firebase')
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'Create an activity' })
  create(
    @Body() dto: CreateActivityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityService.create(
      req.user.company_id,
      dto,
      req.user?.uid,
    );
  }

  @Get()
  @LinkedElement('menu-activities', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'activities' },
    { elementId: 'action-delete-row', interfaceName: 'activities' },
    { elementId: 'action-export-excel', interfaceName: 'activities' },
  ])
  @ApiOperation({ summary: 'List activities by company, optionally filtered by activity type' })
  findAll(
    @Query() query: ListActivitiesQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityService.findAll(
      req.user.company_id,
      query,
      (req as any).visibilityScope ?? null,
      { userId: req.user?.uid, companyId: req.user.company_id },
      (req as any).actionScopes,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export activities as Excel (.xlsx)' })
  async exportAll(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.activityService.exportAll(req.user.company_id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="activities-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityService.findOne(id, req.user.company_id);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'coordinator')
  @WriteScope('action-edit-row', 'activities')
  @ApiOperation({ summary: 'Update an activity' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityService.update(
      id,
      req.user.company_id,
      dto,
      req.user?.uid,
      (req as any).actionScopes?.['action-edit-row'],
    );
  }

  @Delete(':id')
  @Roles('admin', 'manager', 'coordinator')
  @WriteScope('action-delete-row', 'activities')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an activity' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityService.remove(
      id,
      req.user.company_id,
      req.user?.uid,
      (req as any).actionScopes?.['action-delete-row'],
    );
  }
}
