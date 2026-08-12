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
import { AcademicService } from './academic.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { ReorderLevelsDto } from './dto/reorder-levels.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { CreateSchoolClassDto } from './dto/create-school-class.dto';
import { UpdateSchoolClassDto } from './dto/update-school-class.dto';
import { ListLevelsQueryDto } from './dto/list-levels-query.dto';
import { ListHolidaysQueryDto } from './dto/list-holidays-query.dto';
import { Roles } from '../../auth/roles.decorator';
import { LinkedElement } from '../../common/visibility/linked-element.decorator';
import { WithActionScopes } from '../../common/visibility/action-scope.decorator';
import { WriteScope } from '../../common/visibility/action-scope.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('academic')
@ApiBearerAuth('Firebase')
@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  private companyId(req: AuthenticatedRequest): string {
    return req.user.company_id;
  }

  // --- Programs ---
  @Post('programs')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a program' })
  createProgram(@Body() dto: CreateProgramDto, @Request() req: AuthenticatedRequest) {
    return this.academicService.createProgram(this.companyId(req), dto, req.user?.uid);
  }

  @Get('programs')
  @LinkedElement('menu-programs', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'programs' },
    { elementId: 'action-delete-row', interfaceName: 'programs' },
    { elementId: 'action-export-excel', interfaceName: 'programs' },
  ])
  @ApiOperation({ summary: 'List programs' })
  findAllPrograms(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ) {
    return this.academicService.findAllPrograms(
      this.companyId(req),
      query,
      (req as any).visibilityScope ?? null,
      { userId: req.user?.uid, companyId: this.companyId(req) },
      (req as any).actionScopes,
    );
  }

  @Get('programs/export')
  @ApiOperation({ summary: 'Export programs as Excel (.xlsx)' })
  async exportPrograms(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.academicService.exportPrograms(this.companyId(req));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="programs-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Get program by ID' })
  findOneProgram(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.findOneProgram(id, this.companyId(req));
  }

  @Patch('programs/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-edit-row', 'programs')
  @ApiOperation({ summary: 'Update a program' })
  updateProgram(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.academicService.updateProgram(
      id,
      this.companyId(req),
      dto,
      req.user?.uid,
      (req as any).actionScopes?.['action-edit-row'],
    );
  }

  @Delete('programs/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-delete-row', 'programs')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a program' })
  removeProgram(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.removeProgram(
      id,
      this.companyId(req),
      req.user?.uid,
      (req as any).actionScopes?.['action-delete-row'],
    );
  }

  // --- Levels ---
  @Post('levels')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a level' })
  createLevel(@Body() dto: CreateLevelDto, @Request() req: AuthenticatedRequest) {
    return this.academicService.createLevel(this.companyId(req), dto, req.user?.uid);
  }

  @Get('levels')
  @LinkedElement('menu-levels', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'levels' },
    { elementId: 'action-delete-row', interfaceName: 'levels' },
    { elementId: 'action-export-excel', interfaceName: 'levels' },
  ])
  @ApiOperation({ summary: 'List levels' })
  findAllLevels(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListLevelsQueryDto,
  ) {
    return this.academicService.findAllLevels(
      this.companyId(req),
      query,
      (req as any).visibilityScope ?? null,
      { userId: req.user?.uid, companyId: this.companyId(req) },
      (req as any).actionScopes,
    );
  }

  @Get('levels/export')
  @ApiOperation({ summary: 'Export levels as Excel (.xlsx)' })
  async exportLevels(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.academicService.exportLevels(this.companyId(req));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="levels-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }

  @Get('levels/:id')
  @ApiOperation({ summary: 'Get level by ID' })
  findOneLevel(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.findOneLevel(id, this.companyId(req));
  }

  @Patch('levels/reorder')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder levels by providing an ordered list of IDs' })
  reorderLevels(@Body() dto: ReorderLevelsDto) {
    return this.academicService.reorderLevels(dto.ids);
  }

  @Patch('levels/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-edit-row', 'levels')
  @ApiOperation({ summary: 'Update a level' })
  updateLevel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLevelDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.academicService.updateLevel(
      id,
      this.companyId(req),
      dto,
      req.user?.uid,
      (req as any).actionScopes?.['action-edit-row'],
    );
  }

  @Delete('levels/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-delete-row', 'levels')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a level' })
  removeLevel(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.removeLevel(
      id,
      this.companyId(req),
      req.user?.uid,
      (req as any).actionScopes?.['action-delete-row'],
    );
  }

  // --- Subjects ---
  @Post('subjects')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a subject' })
  createSubject(@Body() dto: CreateSubjectDto, @Request() req: AuthenticatedRequest) {
    return this.academicService.createSubject(this.companyId(req), dto, req.user?.uid);
  }

  @Get('subjects')
  @LinkedElement('menu-subjects', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'subjects' },
    { elementId: 'action-delete-row', interfaceName: 'subjects' },
    { elementId: 'action-export-excel', interfaceName: 'subjects' },
  ])
  @ApiOperation({ summary: 'List subjects' })
  findAllSubjects(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ) {
    return this.academicService.findAllSubjects(
      this.companyId(req),
      query,
      (req as any).visibilityScope ?? null,
      { userId: req.user?.uid, companyId: this.companyId(req) },
      (req as any).actionScopes,
    );
  }

  @Get('subjects/export')
  @ApiOperation({ summary: 'Export subjects as Excel (.xlsx)' })
  async exportSubjects(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.academicService.exportSubjects(this.companyId(req));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="subjects-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }

  @Get('subjects/:id')
  @ApiOperation({ summary: 'Get subject by ID' })
  findOneSubject(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.findOneSubject(id, this.companyId(req));
  }

  @Patch('subjects/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-edit-row', 'subjects')
  @ApiOperation({ summary: 'Update a subject' })
  updateSubject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.academicService.updateSubject(
      id,
      this.companyId(req),
      dto,
      req.user?.uid,
      (req as any).actionScopes?.['action-edit-row'],
    );
  }

  @Delete('subjects/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-delete-row', 'subjects')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a subject' })
  removeSubject(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.removeSubject(
      id,
      this.companyId(req),
      req.user?.uid,
      (req as any).actionScopes?.['action-delete-row'],
    );
  }

  // --- School years ---
  @Post('school-years')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a school year' })
  createSchoolYear(@Body() dto: CreateSchoolYearDto, @Request() req: AuthenticatedRequest) {
    return this.academicService.createSchoolYear(this.companyId(req), dto, req.user?.uid);
  }

  @Get('school-years')
  @LinkedElement('menu-school-years', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'schoolYears' },
    { elementId: 'action-delete-row', interfaceName: 'schoolYears' },
    { elementId: 'action-export-excel', interfaceName: 'schoolYears' },
  ])
  @ApiOperation({ summary: 'List school years' })
  findAllSchoolYears(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ) {
    return this.academicService.findAllSchoolYears(
      this.companyId(req),
      query,
      (req as any).visibilityScope ?? null,
      { userId: req.user?.uid, companyId: this.companyId(req) },
      (req as any).actionScopes,
    );
  }

  @Get('school-years/export')
  @ApiOperation({ summary: 'Export school years as Excel (.xlsx)' })
  async exportSchoolYears(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.academicService.exportSchoolYears(this.companyId(req));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="school-years-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }

  @Get('school-years/:id')
  @ApiOperation({ summary: 'Get school year by ID' })
  findOneSchoolYear(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.findOneSchoolYear(id, this.companyId(req));
  }

  @Patch('school-years/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-edit-row', 'schoolYears')
  @ApiOperation({ summary: 'Update a school year' })
  updateSchoolYear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolYearDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.academicService.updateSchoolYear(
      id,
      this.companyId(req),
      dto,
      req.user?.uid,
      (req as any).actionScopes?.['action-edit-row'],
    );
  }

  @Delete('school-years/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-delete-row', 'schoolYears')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a school year' })
  removeSchoolYear(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.removeSchoolYear(
      id,
      this.companyId(req),
      req.user?.uid,
      (req as any).actionScopes?.['action-delete-row'],
    );
  }

  // --- School classes ---
  @Post('school-classes')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a school class (per establishment, year, level)' })
  createSchoolClass(@Body() dto: CreateSchoolClassDto, @Request() req: AuthenticatedRequest) {
    return this.academicService.createSchoolClass(this.companyId(req), dto, req.user?.uid);
  }

  @Get('school-classes')
  @ApiOperation({ summary: 'List school classes (filters: establishmentId, schoolYearId, levelId, search)' })
  findAllSchoolClasses(@Request() req: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.academicService.findAllSchoolClasses(this.companyId(req), query);
  }

  @Get('school-classes/:id')
  @ApiOperation({ summary: 'Get school class by ID' })
  findOneSchoolClass(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.findOneSchoolClass(id, this.companyId(req));
  }

  @Patch('school-classes/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a school class' })
  updateSchoolClass(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolClassDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.academicService.updateSchoolClass(id, this.companyId(req), dto, req.user?.uid);
  }

  @Delete('school-classes/:id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a school class' })
  removeSchoolClass(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.removeSchoolClass(id, this.companyId(req), req.user?.uid);
  }

  // --- Vacation zones (France A/B/C, per company) ---
  @Get('vacation-zones')
  @ApiOperation({ summary: 'List vacation zones for the company' })
  findAllVacationZones(@Request() req: AuthenticatedRequest) {
    return this.academicService.findAllVacationZones(this.companyId(req));
  }

  // --- Holidays ---
  @Post('holidays')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a holiday' })
  createHoliday(@Body() dto: CreateHolidayDto, @Request() req: AuthenticatedRequest) {
    return this.academicService.createHoliday(this.companyId(req), dto, req.user?.uid);
  }

  @Get('holidays')
  @LinkedElement('menu-holidays', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'holidays' },
    { elementId: 'action-delete-row', interfaceName: 'holidays' },
    { elementId: 'action-export-excel', interfaceName: 'holidays' },
  ])
  @ApiOperation({ summary: 'List holidays' })
  findAllHolidays(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListHolidaysQueryDto,
  ) {
    return this.academicService.findAllHolidays(
      this.companyId(req),
      query,
      (req as any).visibilityScope ?? null,
      { userId: req.user?.uid, companyId: this.companyId(req) },
      (req as any).actionScopes,
    );
  }

  @Get('holidays/export')
  @ApiOperation({ summary: 'Export holidays as Excel (.xlsx)' })
  async exportHolidays(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.academicService.exportHolidays(this.companyId(req));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="holidays-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }

  @Get('holidays/:id')
  @ApiOperation({ summary: 'Get holiday by ID' })
  findOneHoliday(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.findOneHoliday(id, this.companyId(req));
  }

  @Patch('holidays/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-edit-row', 'holidays')
  @ApiOperation({ summary: 'Update a holiday' })
  updateHoliday(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.academicService.updateHoliday(
      id,
      this.companyId(req),
      dto,
      req.user?.uid,
      (req as any).actionScopes?.['action-edit-row'],
    );
  }

  @Delete('holidays/:id')
  @Roles('admin', 'manager')
  @WriteScope('action-delete-row', 'holidays')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a holiday' })
  removeHoliday(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.academicService.removeHoliday(
      id,
      this.companyId(req),
      req.user?.uid,
      (req as any).actionScopes?.['action-delete-row'],
    );
  }
}
