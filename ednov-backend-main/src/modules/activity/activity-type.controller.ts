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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ActivityTypeService } from './activity-type.service';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';
import { Roles } from '../../auth/roles.decorator';
import { LinkedElement } from '../../common/visibility/linked-element.decorator';
import { WithActionScopes } from '../../common/visibility/action-scope.decorator';
import { WriteScope } from '../../common/visibility/action-scope.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ListActivityTypesQueryDto } from './dto/list-activity-types-query.dto';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('activity-types')
@ApiBearerAuth('Firebase')
@Controller('activity-types')
export class ActivityTypeController {
  constructor(private readonly activityTypeService: ActivityTypeService) {}

  @Post()
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'Create an activity type' })
  create(
    @Body() dto: CreateActivityTypeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityTypeService.create(
      req.user.company_id,
      dto,
      req.user?.uid,
    );
  }

  @Get()
  @LinkedElement('menu-activity-types', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'activityTypes' },
    { elementId: 'action-delete-row', interfaceName: 'activityTypes' },
    { elementId: 'action-export-excel', interfaceName: 'activityTypes' },
  ])
  @ApiOperation({ summary: 'List activity types by company' })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListActivityTypesQueryDto,
  ) {
    return this.activityTypeService.findAll(
      req.user.company_id,
      query,
      (req as any).visibilityScope ?? null,
      { userId: req.user?.uid, companyId: req.user.company_id },
      (req as any).actionScopes,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export activity types as Excel (.xlsx)' })
  async exportAll(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.activityTypeService.exportAll(req.user.company_id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="activity-types-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity type by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityTypeService.findOne(id, req.user.company_id);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'coordinator')
  @WriteScope('action-edit-row', 'activityTypes')
  @ApiOperation({ summary: 'Update an activity type' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityTypeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityTypeService.update(
      id,
      req.user.company_id,
      dto,
      req.user?.uid,
      (req as any).actionScopes?.['action-edit-row'],
    );
  }

  @Delete(':id')
  @Roles('admin', 'manager', 'coordinator')
  @WriteScope('action-delete-row', 'activityTypes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an activity type' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activityTypeService.remove(
      id,
      req.user.company_id,
      req.user?.uid,
      (req as any).actionScopes?.['action-delete-row'],
    );
  }
}
