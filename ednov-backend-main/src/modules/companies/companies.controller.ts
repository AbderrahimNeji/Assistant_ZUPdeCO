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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../auth/roles.decorator';
import { LinkedElement } from '../../common/visibility/linked-element.decorator';
import { WithActionScopes, WriteScope } from '../../common/visibility/action-scope.decorator';
import { AuthenticatedRequest } from '../../auth/authenticated-request.interface';
import { CompaniesService } from './companies.service';
import { SessionsService } from '../sessions/sessions.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ListCompaniesQueryDto } from './dto/list-companies-query.dto';
import type { EstablishmentCategory, EstablishmentPriorityNetwork, EstablishmentStatus, EstablishmentType } from './entities/establishment.entity';

@ApiTags('companies')
@ApiBearerAuth('Firebase')
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new company (admin only)' })
  @ApiResponse({ status: 201, description: 'Company created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  async create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all companies (paginated; optional: status, code, q)' })
  @ApiResponse({ status: 200, description: 'Paginated list of companies (data, total, page, pageSize)' })
  async findAll(@Query() query: ListCompaniesQueryDto) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters =
      query?.status || query?.code || query?.q
        ? { status: query.status, code: query.code, q: query.q }
        : undefined;
    return this.companiesService.findAll(page, pageSize, filters);
  }

  @Get('dashboard/manager')
  @Roles('admin')
  @ApiOperation({ summary: 'Multi-institution manager dashboard (admin only, paginated; optional: status, code, q)' })
  @ApiResponse({ status: 200, description: 'Paginated companies with aggregated counts (data, total, page, pageSize)' })
  getManagerDashboard(@Query() query: ListCompaniesQueryDto) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters =
      query?.status || query?.code || query?.q
        ? { status: query.status, code: query.code, q: query.q }
        : undefined;
    return this.companiesService.getManagerDashboard(page, pageSize, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/establishments')
  @LinkedElement('menu-establishments', 'sidebar')
  @WithActionScopes([
    { action: 'action-edit-row', interfaceName: 'establishments' },
    { action: 'action-delete-row', interfaceName: 'establishments' },
    { action: 'action-export-excel', interfaceName: 'establishments' },
  ])
  @ApiOperation({ summary: 'List establishments for a company (paginated)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Paginated list of establishments (data, total, page, pageSize)' })
  async findEstablishments(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: false }) res: Response,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('types') types?: string | string[],
    @Query('statuses') statuses?: string | string[],
    @Query('coordinatorId') coordinatorId?: string,
    @Query('managedById') managedById?: string,
    @Query('specialtyIds') specialtyIds?: string | string[],
    @Query('categories') categories?: string | string[],
    @Query('priorityNetworks') priorityNetworks?: string | string[],
    @Query('isQpv') isQpvRaw?: string,
    @Query('search') search?: string,
    @Query('cities') cities?: string | string[],
    @Query('departments') departments?: string | string[],
    @Query('exportCsv') exportCsv?: string,
    @Query('exportExcel') exportExcel?: string,
  ): Promise<void> {
    const actionScopes = req.actionScopes;
    const filters: {
      types?: EstablishmentType[];
      statuses?: EstablishmentStatus[];
      coordinatorId?: string;
      managedById?: string;
      specialtyIds?: string[];
      categories?: EstablishmentCategory[];
      priorityNetworks?: EstablishmentPriorityNetwork[];
      isQpv?: boolean | null;
      search?: string;
      cities?: string[];
      departments?: string[];
    } = {};
    if (types) {
      filters.types = (Array.isArray(types) ? types : [types]) as EstablishmentType[];
    }
    if (statuses) {
      filters.statuses = (Array.isArray(statuses) ? statuses : [statuses]) as EstablishmentStatus[];
    }
    if (coordinatorId) {
      filters.coordinatorId = coordinatorId;
    }
    if (managedById) {
      filters.managedById = managedById;
    }
    if (specialtyIds) {
      filters.specialtyIds = Array.isArray(specialtyIds) ? specialtyIds : [specialtyIds];
    }
    if (categories) {
      filters.categories = (Array.isArray(categories) ? categories : [categories]) as EstablishmentCategory[];
    }
    if (priorityNetworks) {
      filters.priorityNetworks = (Array.isArray(priorityNetworks) ? priorityNetworks : [priorityNetworks]) as EstablishmentPriorityNetwork[];
    }
    if (isQpvRaw !== undefined) {
      filters.isQpv = isQpvRaw === 'true' ? true : isQpvRaw === 'false' ? false : null;
    }
    if (search) {
      filters.search = search;
    }
    if (cities) {
      filters.cities = Array.isArray(cities) ? cities : [cities];
    }
    if (departments) {
      filters.departments = Array.isArray(departments) ? departments : [departments];
    }

    const shouldExport =
      String(exportCsv ?? '').toLowerCase() === 'true' ||
      String(exportExcel ?? '').toLowerCase() === 'true';
    if (shouldExport) {
      const buffer = await this.companiesService.exportEstablishmentsCsv(
        id,
        Object.keys(filters).length > 0 ? filters : undefined,
        req.user?.uid,
        req.user?.roles,
        req.visibilityScope,
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="establishments-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      );
      res.send(buffer);
      return;
    }

    const data = await this.companiesService.findEstablishments(
      id,
      page ?? 1,
      pageSize ?? 20,
      Object.keys(filters).length > 0 ? filters : undefined,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
      actionScopes,
    );
    res.status(HttpStatus.OK).json(data);
  }

  @Post(':id/establishments')
  @ApiOperation({ summary: 'Create an establishment' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Establishment created' })
  @ApiResponse({ status: 409, description: 'UAI code already exists' })
  async createEstablishment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEstablishmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.companiesService.createEstablishment(id, dto, req.user?.uid);
  }

  @Get(':id/establishments/search')
  @LinkedElement('menu-establishments', 'sidebar')
  @ApiOperation({ summary: 'Search establishments by name for a company' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async searchEstablishments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('query') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('department') department?: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.companiesService.searchEstablishments(
      id,
      query,
      page ?? 1,
      limit ?? 5,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
      department,
    );
  }

  @Get(':id/establishments/:establishmentId')
  @LinkedElement('menu-establishments', 'sidebar')
  @ApiOperation({ summary: 'Get establishment by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'establishmentId', type: 'string', format: 'uuid' })
  async findOneEstablishment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('establishmentId', ParseUUIDPipe) establishmentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.companiesService.findOneEstablishment(
      id,
      establishmentId,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
    );
  }

  @Patch(':id/establishments/:establishmentId')
  @WriteScope('action-edit-row', 'establishments')
  @ApiOperation({ summary: 'Update an establishment' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'establishmentId', type: 'string', format: 'uuid' })
  async updateEstablishment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('establishmentId', ParseUUIDPipe) establishmentId: string,
    @Body() dto: UpdateEstablishmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const writeScope = req.writeScope;
    return this.companiesService.updateEstablishment(
      id,
      establishmentId,
      dto,
      req.user?.uid,
      writeScope,
    );
  }

  @Delete(':id/establishments/:establishmentId')
  @WriteScope('action-delete-row', 'establishments')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an establishment' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'establishmentId', type: 'string', format: 'uuid' })
  async removeEstablishment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('establishmentId', ParseUUIDPipe) establishmentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const writeScope = req.writeScope;
    await this.companiesService.removeEstablishment(
      id,
      establishmentId,
      req.user?.uid,
      writeScope,
    );
  }

  @Get(':id/rooms')
  @ApiOperation({ summary: 'List rooms for a company' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of rooms' })
  async findRooms(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('establishmentId') establishmentId?: string,
  ) {
    return this.companiesService.findRooms(id, establishmentId);
  }

  @Post(':id/rooms')
  @ApiOperation({ summary: 'Create a room' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Room created' })
  async createRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRoomDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.companiesService.createRoom(id, dto, req.user?.uid);
  }

  @Get(':id/rooms/:roomId')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'roomId', type: 'string', format: 'uuid' })
  async findOneRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.companiesService.findOneRoom(id, roomId);
  }

  @Patch(':id/rooms/:roomId')
  @ApiOperation({ summary: 'Update a room' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'roomId', type: 'string', format: 'uuid' })
  async updateRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.companiesService.updateRoom(id, roomId, dto, req.user?.uid);
  }

  @Delete(':id/rooms/:roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a room' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'roomId', type: 'string', format: 'uuid' })
  async removeRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.companiesService.removeRoom(id, roomId, req.user?.uid);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.companiesService.update(id, dto, req.user?.uid);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a company (admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.companiesService.remove(id, req.user?.uid);
  }

  @Get(':id/sessions/student-tutor-pairs')
  @LinkedElement('menu-matching', 'sidebar')
  @WithActionScopes([
    { action: 'action-delete-row', interfaceName: 'matching' },
  ])
  @ApiOperation({ summary: 'List all student-tutor pairs across all sessions for the company (for matching interface)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of student-tutor pairs with session, student, and tutor details' })
  async getSessionStudentTutorPairs(
    @Param('id', ParseUUIDPipe) companyId: string,
    @Query() query: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const actionScopes = req.actionScopes;
    return this.sessionsService.getAllStudentTutorPairs(
      companyId,
      query,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
      actionScopes,
    );
  }
}