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
  ForbiddenException,
  BadRequestException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Roles } from '../../auth/roles.decorator';
import { Public } from '../../auth/public.decorator';
import { LinkedElement } from '../../common/visibility/linked-element.decorator';
import { WithActionScopes, WriteScope } from '../../common/visibility/action-scope.decorator';
import { AuthenticatedRequest } from '../../auth/authenticated-request.interface';
import { UsersService } from './users.service';
import { InvitationService } from './invitation.service';
import { UsersVscConfigService } from './users-vsc-config.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserWithInvitationDto } from './dto/create-user-with-invitation.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { BulkCreateUsersDto } from './dto/bulk-create-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListUsersByRoleQueryDto } from './dto/list-users-by-role-query.dto';
import { UpdateVscReportsFrequenciesDto } from './dto/update-vsc-reports-frequencies.dto';
import { ImportUsersCsvQueryDto } from './dto/import-users-csv-query.dto';
import { ImportUsersCsvResultDto } from './dto/import-users-csv-result.dto';
import type { ReactivationTargetStatus } from './user-status';
import { CriminalRecordsService } from '../criminal-records/criminal-records.service';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Staff roles see the full company student directory on GET /users/students. */
function hasStaffListRole(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  const upper = new Set(roles.map((r) => (r ?? '').toUpperCase()));
  return ['ADMIN', 'MANAGER', 'COORDINATOR'].some((code) => upper.has(code));
}

/** Tutors get only students linked via sessions, pairs, or managed_by. Volunteers see students from their establishments. */
function hasTutorLikeListRole(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  const upper = new Set(roles.map((r) => (r ?? '').toUpperCase()));
  return upper.has('TUTOR') || upper.has('VOLUNTEER');
}

function mapAvailabilityToEngagement(availability: Record<string, unknown> | null | undefined): { day: string; start: string; end: string }[] {
  if (!availability || typeof availability !== 'object') return [];
  const weekly = (availability as { weekly?: { day: number; start: string; end: string }[] }).weekly;
  if (!Array.isArray(weekly) || weekly.length === 0) return [];
  return weekly.map((slot) => ({
    day: DAY_NAMES[slot.day] ?? `Jour ${slot.day}`,
    start: String(slot.start ?? '').trim() || '09:00',
    end: String(slot.end ?? '').trim() || '12:00',
  }));
}

@ApiTags('users')
@ApiBearerAuth('Firebase')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitationService: InvitationService,
    private readonly usersVscConfigService: UsersVscConfigService,
    private readonly criminalRecordsService: CriminalRecordsService,
  ) {}

  @Get('login')
  @ApiOperation({ summary: 'Login / get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Invalid or missing Firebase ID token' })
  @ApiResponse({ status: 404, description: 'User not found in DB' })
  async getLogin(@Request() req: AuthenticatedRequest) {
    try {
      const firebaseUid = req.user?.firebaseUid ?? req.user?.uid;
      console.log('[UsersController.getLogin] Starting login request');
      console.log('[UsersController.getLogin] Firebase UID:', firebaseUid);
      console.log('[UsersController.getLogin] Company ID:', req.user?.company_id);
      console.log('[UsersController.getLogin] Roles:', req.user?.roles);
      
      const user = await this.usersService.findMeByFirebaseUid(firebaseUid);
      console.log('[UsersController.getLogin] User found:', user?.id);
      
      const engagement = mapAvailabilityToEngagement(user.userProfiles?.[0]?.availability ?? undefined);
      const criminalRecord = await this.criminalRecordsService.getSummaryForUser(
        user.id,
        user.companyId,
      );
      const tutorPlatformStatus = await this.criminalRecordsService.getTutorPlatformStatus(user.id);
      console.log('[UsersController.getLogin] Login successful');

      return { ...user, engagement, criminalRecord, tutorPlatformStatus };
    } catch (error) {
      console.error('[UsersController.getLogin] Error during login:', error);
      console.error('[UsersController.getLogin] Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  @Get('tutors')
  @LinkedElement('menu-tutors', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'tutors' },
    { elementId: 'action-delete-row', interfaceName: 'tutors' },
    { elementId: 'action-reactivate', interfaceName: 'tutors' },
  ])
  @ApiOperation({ summary: 'List tutors (volunteer role) with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of tutors' })
  async getTutors(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersByRoleQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters = {
      search: query.search,
      excludeIds: query.excludeIds,
      statuses: query.statuses,
      establishmentId: query.establishmentId,
      establishmentIds: query.establishmentIds,
      subjectIds: query.subjectIds,
      classIds: query.classIds,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      availabilityDayOfWeek: query.availabilityDayOfWeek,
      availabilityStartTime: query.availabilityStartTime,
      availabilityEndTime: query.availabilityEndTime,
      availabilityDays: query.availabilityDays,
      roleCodes: query.roleCodes,
      engagementStartDateFrom: query.engagementStartDateFrom,
      engagementStartDateTo: query.engagementStartDateTo,
      tutorExitDateFrom: query.tutorExitDateFrom,
      tutorExitDateTo: query.tutorExitDateTo,
      tutorExitReason: query.tutorExitReason,
    };

    // if (query?.exportCsv) {
    //   const csv = await this.usersService.exportTutorsCsv(req.user.company_id, filters);
    //   res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    //   res.setHeader(
    //     'Content-Disposition',
    //     `attachment; filename="tutors-${new Date().toISOString().slice(0, 10)}.csv"`,
    //   );
    //   return res.send(csv);
    // }

    return this.usersService.findTutors(req.user.company_id, page, pageSize, filters, req.visibilityScope, req.user.uid, req.actionScopes);
  }

  @Get('tutors/export')
  @ApiOperation({ summary: 'Export tutors as Excel (.xlsx) (optional query filters)' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportTutors(
    @Query() query: ListUsersByRoleQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const filters = {
      search: query?.search,
      excludeIds: query?.excludeIds,
      statuses: query?.statuses,
      establishmentId: query?.establishmentId,
      establishmentIds: query?.establishmentIds,
      subjectIds: query?.subjectIds,
      levelIds: query?.levelIds,
      classIds: query?.classIds,
      dateFrom: query?.dateFrom,
      dateTo: query?.dateTo,
      availabilityDayOfWeek: query?.availabilityDayOfWeek,
      availabilityStartTime: query?.availabilityStartTime,
      availabilityEndTime: query?.availabilityEndTime,
      availabilityDays: query?.availabilityDays,
    };
    const buffer = await this.usersService.exportTutorsCsv(req.user.company_id, filters);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tutors-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('tutors/:id')
  @ApiOperation({ summary: 'Get a tutor by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTutor(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.usersService.findTutor(id, req.user.company_id);
    const pendingActivation = await this.invitationService.isPendingActivation(user);
    return { ...(user as object), pendingActivation };
  }

  @Get('students')
  @LinkedElement('menu-students', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'students' },
    { elementId: 'action-delete-row', interfaceName: 'students' },
    { elementId: 'action-reactivate', interfaceName: 'students' },
    { elementId: 'action-import-csv', interfaceName: 'students' },
  ])
  @ApiOperation({ summary: 'List students with pagination and search (staff: all company; volunteer: establishments; tutor: linked)' })
  @ApiResponse({ status: 200, description: 'Paginated list of students' })
  async getStudents(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersByRoleQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters = {
      search: query.search,
      excludeIds: query.excludeIds,
      statuses: query.statuses,
      establishmentId: query.establishmentId,
      establishmentIds: query.establishmentIds,
      subjectIds: query.subjectIds,
      levelIds: query.levelIds,
      classIds: query.classIds,
      specialtyIds: query.specialtyIds,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      availabilityDayOfWeek: query.availabilityDayOfWeek,
      availabilityStartTime: query.availabilityStartTime,
      availabilityEndTime: query.availabilityEndTime,
      isMinor: query.isMinor,
      hasSpecialNeeds: query.hasSpecialNeeds,
      exitDateFrom: query.exitDateFrom,
      exitDateTo: query.exitDateTo,
      exitReason: query.exitReason,
    };
    const roles = req.user.roles;
    const upperRoles = new Set((roles ?? []).map((r) => (r ?? '').toUpperCase()));
    const tutorStudentListRequested =
      query.tutorStudentList === 'true' || query.tutorStudentList === '1';
    const tutorScoped =
      hasTutorLikeListRole(roles) &&
      (!hasStaffListRole(roles) || tutorStudentListRequested);
    if (tutorScoped) {
      if (upperRoles.has('VOLUNTEER')) {
        return this.usersService.findStudentsForVolunteerByEstablishments(
          req.user.company_id,
          req.user.uid,
          page,
          pageSize,
          filters,
          req.actionScopes,
        );
      }
      return this.usersService.findStudentsForTutor(
        req.user.company_id,
        req.user.uid,
        page,
        pageSize,
        filters,
        undefined,
        req.actionScopes,
      );
    }
    return this.usersService.findStudents(req.user.company_id, page, pageSize, filters, req.visibilityScope, req.user.uid, req.actionScopes);
  }

  @Get('students/export')
  @ApiOperation({ summary: 'Export students as Excel (.xlsx) (optional query filters)' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportStudents(
    @Query() query: ListUsersByRoleQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const filters = {
      search: query?.search,
      excludeIds: query?.excludeIds,
      statuses: query?.statuses,
      establishmentId: query?.establishmentId,
      establishmentIds: query?.establishmentIds,
      subjectIds: query?.subjectIds,
      levelIds: query?.levelIds,
      classIds: query?.classIds,
      roleCodes: query?.roleCodes,
      dateFrom: query?.dateFrom,
      dateTo: query?.dateTo,
      isMinor: query?.isMinor,
      hasSpecialNeeds: query?.hasSpecialNeeds,
    };
    const buffer = await this.usersService.exportStudentsCsv(req.user.company_id, filters);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('students/:id')
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.usersService.findStudent(id, req.user.company_id);
    if (user.status === 'deactivated') {
      const [presentSessionCount, deactivationEntry] = await Promise.all([
        this.usersService.getStudentPresentSessionsCount(id),
        this.usersService.getLatestDeactivationEntry(id),
      ]);
      const reactivationTargetStatus: ReactivationTargetStatus =
        this.usersService.studentReactivationTargetFromPresentCount(presentSessionCount);
      return {
        ...user,
        presentSessionCount,
        reactivationTargetStatus,
        deactivationReason: deactivationEntry?.reason ?? null,
        deactivationReasonNote: deactivationEntry?.reasonNote ?? null,
      };
    }
    return user;
  }

  @Get('volunteers')
  @LinkedElement('menu-volunteers', 'sidebar')
  @ApiOperation({ summary: 'List volunteers (VSC) with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of volunteers' })
  async getVolunteers(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersByRoleQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters = {
      search: query.search,
      excludeIds: query.excludeIds,
      statuses: query.statuses,
      establishmentId: query.establishmentId,
      establishmentIds: query.establishmentIds,
      subjectIds: query.subjectIds,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      availabilityDays: query.availabilityDays,
      vscFrequencies: query.vscFrequencies,
      roleCodes: query.roleCodes,
      engagementStartDateFrom: query.engagementStartDateFrom,
      engagementStartDateTo: query.engagementStartDateTo,
      tutorExitDateFrom: query.tutorExitDateFrom,
      tutorExitDateTo: query.tutorExitDateTo,
      tutorExitReason: query.tutorExitReason,
    };


    // if (query?.exportCsv) {
    //   const csv = await this.usersService.exportVolunteersCsv(req.user.company_id, filters);
    //   res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    //     'Content-Disposition',
    //     `attachment; filename="volunteers-${new Date().toISOString().slice(0, 10)}.csv"`,
    //   );
    //   return res.send(csv);
    // }

    return this.usersService.findVolunteers(req.user.company_id, page, pageSize, filters, req.visibilityScope, req.user.uid, req.actionScopes);
  }
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportVolunteers(
    @Query() query: ListUsersByRoleQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const filters = {
      search: query?.search,
      excludeIds: query?.excludeIds,
      statuses: query?.statuses,
      establishmentId: query?.establishmentId,
      establishmentIds: query?.establishmentIds,
      subjectIds: query?.subjectIds,
      levelIds: query?.levelIds,
      classIds: query?.classIds,
      dateFrom: query?.dateFrom,
      dateTo: query?.dateTo,
      availabilityDayOfWeek: query?.availabilityDayOfWeek,
      availabilityStartTime: query?.availabilityStartTime,
      availabilityEndTime: query?.availabilityEndTime,
      availabilityDays: query?.availabilityDays,
      vscFrequencies: query?.vscFrequencies,
      roleCodes: query?.roleCodes,
    };
    const buffer = await this.usersService.exportVolunteersCsv(req.user.company_id, filters);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="volunteers-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('volunteers/:id')
  @ApiOperation({ summary: 'Get a volunteer by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getVolunteer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.usersService.findVolunteer(id, req.user.company_id);
    const pendingActivation = await this.invitationService.isPendingActivation(user);
    return { ...(user as object), pendingActivation };
  }

  @Get('admins')
  @LinkedElement('menu-admins', 'sidebar')
  @ApiOperation({
    summary:
      'List admins (admin, manager, coordinator; optional recruiter via roleCodes). When roleCodes is only recruiter, returns all recruiters for the company (visibility scope bypass). Role codes accept commas (?roleCodes=recruiter or admin,coordinator).',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of admins' })
  async getAdmins(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersByRoleQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters = {
      search: query.search,
      excludeIds: query.excludeIds,
      statuses: query.statuses,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      roleCodes: query.roleCodes,
    };
    return this.usersService.findAdmins(
      req.user.company_id,
      page,
      pageSize,
      filters,
      req.visibilityScope,
      req.user.uid,
      req.actionScopes,
    );
  }

  @Get('admins/export')
  @ApiOperation({ summary: 'Export admins (admin, manager, coordinator) as Excel (.xlsx)' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  async exportAdmins(
    @Query() query: ListUsersByRoleQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const filters = {
      search: query?.search,
      statuses: query?.statuses,
      roleCodes: query?.roleCodes,
      dateFrom: query?.dateFrom,
      dateTo: query?.dateTo,
    };
    const buffer = await this.usersService.exportAdminsCsv(req.user.company_id, filters);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="admins-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  }

  @Get('admins/:id')
  @ApiOperation({ summary: 'Get an admin by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.usersService.findAdmin(id, req.user.company_id);
    const pendingActivation = await this.invitationService.isPendingActivation(user);
    return { ...(user as object), pendingActivation };
  }

  @Get('managers')
  @ApiOperation({ summary: 'List managers with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of managers' })
  async getManagers(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersByRoleQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters = query?.search || query?.excludeIds
      ? { search: query.search, excludeIds: query.excludeIds }
      : undefined;
    return this.usersService.findManagers(req.user.company_id, page, pageSize, filters, undefined, undefined, req.actionScopes);
  }

  @Get('managers/:id')
  @ApiOperation({ summary: 'Get a manager by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getManager(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.findManager(id, req.user.company_id);
  }

  @Get('coordinators')
  @ApiOperation({ summary: 'List coordinators with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of coordinators' })
  async getCoordinators(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersByRoleQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters = query?.search || query?.excludeIds || query?.managedById
      ? { search: query.search, excludeIds: query.excludeIds, managedById: query.managedById }
      : undefined;
    return this.usersService.findCoordinators(req.user.company_id, page, pageSize, filters, undefined, undefined, req.actionScopes);
  }

  @Get('coordinators/:id')
  @ApiOperation({ summary: 'Get a coordinator by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getCoordinator(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.findCoordinator(id, req.user.company_id);
  }

  @Get('superadmins')
  @ApiOperation({ summary: 'List superadmins (admin role only) with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of superadmins' })
  async getSuperadmins(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersByRoleQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters = query?.search || query?.excludeIds
      ? { search: query.search, excludeIds: query.excludeIds }
      : undefined;
    return this.usersService.findSuperadmins(req.user.company_id, page, pageSize, filters, undefined, undefined, req.actionScopes);
  }

  @Get('superadmins/:id')
  @ApiOperation({ summary: 'Get a superadmin by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getSuperadmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.findSuperadmin(id, req.user.company_id);
  }

  @Get('for-sharing')
  @ApiOperation({ summary: 'List users for post-it sharing (volunteer, coordinator, manager roles) with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated list of users for sharing' })
  async getUsersForSharing(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersByRoleQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const filters: { search?: string; excludeIds?: string; roleCodes?: string[] } = {};
    
    if (query?.search) filters.search = query.search;
    if (query?.excludeIds) filters.excludeIds = query.excludeIds;
    if (query?.roleCodes?.length) filters.roleCodes = query.roleCodes;
    
    return this.usersService.findUsersForSharing(
      req.user.company_id, 
      page, 
      pageSize, 
      Object.keys(filters).length > 0 ? filters : undefined
    );
  }

  @Post('invite')
  @ApiOperation({ summary: 'Create a user with invitation (accessible to all authenticated users)' })
  @ApiResponse({ status: 201, description: 'User created and invitation sent' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  @ApiResponse({ status: 400, description: 'Invalid invitation data' })
  async invite(@Body() dto: CreateUserWithInvitationDto, @Request() req: AuthenticatedRequest) {
    console.log('[users/invite] incoming request', {
      companyId: req.user.company_id,
      actorUid: req.user.uid,
      inviteBy: dto.inviteBy,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roleIds: dto.roleIds?.length ?? 0,
      establishmentIds: dto.establishmentIds?.length ?? 0,
      profileId: dto.profileId ?? null,
      managedById: dto.managedById ?? null,
    });

    let result: Awaited<ReturnType<InvitationService['createUserWithInvitation']>>;
    try {
      result = await this.invitationService.createUserWithInvitation(
        req.user.company_id,
        dto,
        req.user.uid,
      );
    } catch (err) {
      const e = err as Error;
      console.error('[users/invite] handler error', {
        message: e.message,
        name: e.name,
        stack: e.stack,
      });
      throw err;
    }

    console.log('[users/invite] success', {
      userId: result.user?.id,
      firebaseUid: result.user?.firebaseUid,
      invitationMethod: dto.inviteBy,
      invitationLinkLength: result.invitationLink?.length ?? 0,
    });

    return {
      user: result.user,
      invitationSent: true,
      invitationMethod: dto.inviteBy,
      invitationLink: result.invitationLink,
    };
  }

  @Post('activate')
  @Public()
  @ApiOperation({ summary: 'Activate an account from an email invitation token and set the password' })
  @ApiResponse({ status: 201, description: 'Account activated; password set' })
  @ApiResponse({ status: 400, description: 'Invalid or expired activation token' })
  @ApiResponse({ status: 409, description: 'Account already activated' })
  async activate(@Body() dto: ActivateAccountDto) {
    const result = await this.invitationService.activateAccount(dto);
    return { activated: true, ...result };
  }

  @Post(':id/regenerate-invitation')
  @WriteScope('action-edit-row', 'users')
  @ApiOperation({ summary: 'Regenerate and re-send the activation email (14-day link) for a pending user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'New activation email sent' })
  @ApiResponse({ status: 400, description: 'User not found or has no email (phone invite)' })
  @ApiResponse({ status: 409, description: 'Account already activated' })
  async regenerateInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const canUpdateOthers =
      req.user.roles?.includes('admin') || req.user.roles?.includes('coordinator');
    if (id !== req.user.uid && !canUpdateOthers) {
      throw new ForbiddenException('Not allowed to regenerate this invitation');
    }
    return this.invitationService.regenerateInvitation(id, req.user.company_id, req.user.uid);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user (admin/coordinator/volunteer)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Firebase UID or email already exists' })
  async create(@Body() dto: CreateUserDto, @Request() req: AuthenticatedRequest) {
    return this.usersService.create(req.user.company_id, dto, req.user.uid);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create users (admin/coordinator only)' })
  @ApiResponse({ status: 201, description: 'Users created' })
  @ApiResponse({ status: 409, description: 'One or more Firebase UID/email already exist' })
  async bulkCreate(
    @Body() dto: BulkCreateUsersDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.bulkCreate(
      req.user.company_id,
      dto.users,
      req.user.uid,
    );
  }

  @Post('import-csv')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'csv', maxCount: 1 },
      { name: 'csvFile', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary:
      'Import students from CSV (multipart file). Required CSV columns: firstName, lastName, email, codeEstablishment. Optional: displayName. Partial import; skip existing emails; fallback to STUDENT role when applicable. Persists user in DB with firebaseUid from CSV or generated (csv-...); does not create Firebase Auth users (unlike POST /users/invite).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: ImportUsersCsvResultDto })
  async importCsv(
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      csv?: Express.Multer.File[];
      csvFile?: Express.Multer.File[];
    },
    @Query() query: ImportUsersCsvQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ImportUsersCsvResultDto> {
    const file = files?.file?.[0] ?? files?.csv?.[0] ?? files?.csvFile?.[0];
    if (!file) {
      throw new BadRequestException('CSV file is required (multipart field: file, csv, or csvFile)');
    }
    return this.usersService.importUsersFromCsv(
      req.user.company_id,
      file,
      req.user.uid,
      query,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all users in the company (paginated, optional: status, q, roleId, excludeIds). When roleId is "tutor", also includes "volunteer" role.' })
  @ApiResponse({ status: 200, description: 'Paginated list of users (data, total, page, pageSize)' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersQueryDto,
  ) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const q = query?.q || query?.search || undefined;
    const filters =
      query?.status || q || query?.roleId || query?.excludeIds
        ? { status: query.status, q, roleId: query.roleId, excludeIds: query.excludeIds }
        : undefined;
    return this.usersService.findAll(req.user.company_id, page, pageSize, filters);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (self)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(@Body() dto: UpdateUserDto, @Request() req: AuthenticatedRequest) {
    return this.usersService.update(req.user.uid, req.user.company_id, dto, req.user.uid);
  }

  /**
   * Tutor self-service casier (literal `me/` segment).
   * - GET `me/criminal-record*` must stay above GET `:id/criminal-record*` or `me` is parsed as UUID (ParseUUIDPipe 400).
   * - POST upload is unaffected: there is no `Post(':id/criminal-record')`, only `Post(':id/criminal-record/validate')` (different path).
   */
  @Post('me/criminal-record')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload or replace criminal record PDF (tutor only; replace only while pending)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Uploaded' })
  async uploadMyCriminalRecord(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    this.criminalRecordsService.assertTutorRoles(req.user.roles ?? []);
    if (!file) throw new BadRequestException('No file provided');
    return this.criminalRecordsService.uploadForSelf(req.user.uid, req.user.company_id, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });
  }

  @Get('me/criminal-record')
  @ApiOperation({ summary: 'Get my criminal record metadata (tutor)' })
  async getMyCriminalRecord(@Request() req: AuthenticatedRequest) {
    this.criminalRecordsService.assertTutorRoles(req.user.roles ?? []);
    const row = await this.criminalRecordsService.getForUser(req.user.uid, req.user.company_id);
    return { criminalRecord: this.criminalRecordsService.toSummary(row) };
  }

  @Get('me/criminal-record/download-url')
  @ApiOperation({ summary: 'Signed URL to download my criminal record PDF (tutor)' })
  async getMyCriminalRecordDownloadUrl(@Request() req: AuthenticatedRequest) {
    return this.criminalRecordsService.getDownloadUrlForSelf(req.user.uid, req.user.company_id);
  }

  @Get(':id/criminal-record')
  @Roles('admin', 'ADMIN', 'manager', 'MANAGER', 'coordinator', 'COORDINATOR')
  @ApiOperation({ summary: 'Get tutor criminal record metadata (staff)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTutorCriminalRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const criminalRecord = await this.criminalRecordsService.getForTutorAsStaff(id, req.user.company_id);
    return { criminalRecord };
  }

  @Get(':id/criminal-record/download-url')
  @Roles('admin', 'ADMIN', 'manager', 'MANAGER', 'coordinator', 'COORDINATOR')
  @ApiOperation({ summary: 'Signed URL for tutor criminal record PDF (staff)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTutorCriminalRecordDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.criminalRecordsService.getDownloadUrlForTutorAsStaff(id, req.user.company_id);
  }

  @Post(':id/criminal-record/validate')
  @Roles('coordinator', 'COORDINATOR')
  @ApiOperation({ summary: 'Validate tutor criminal record (coordinator); sets tutor platform status active' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async validateTutorCriminalRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.criminalRecordsService.validateAsCoordinator(id, req.user.company_id, req.user.uid);
  }

  @Post(':id/reactivate')
  @WriteScope('action-reactivate', 'users')
  @ApiOperation({
    summary:
      'Réactiver un élève désactivé (Inscrit / Accompagné) ou un compte staff suspendu (→ actif)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User reactivated' })
  async reactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.reactivateUser(id, req.user.company_id, req.user.uid, req.actionScopes?.['action-reactivate']);
  }

  @Get(':id/status-history')
  @ApiOperation({
    summary: 'Historique des changements de statut élève',
    description:
      'Données depuis la table `student_status_history`. Réservé aux comptes élève.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Liste des transitions (récent en premier)' })
  async getStudentStatusHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.getStudentStatusHistory(id, req.user.company_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.usersService.findOne(id, req.user.company_id);
    const isStudent = await this.usersService.userHasStudentRole(id, req.user.company_id);

    if (user.status === 'deactivated' && isStudent) {
      const presentSessionCount = await this.usersService.getStudentPresentSessionsCount(id);
      const reactivationTargetStatus: ReactivationTargetStatus =
        this.usersService.studentReactivationTargetFromPresentCount(presentSessionCount);
      return {
        ...user,
        presentSessionCount,
        reactivationTargetStatus,
      };
    }

    if (user.status === 'deactivated' && !isStudent) {
      const reactivationTargetStatus: ReactivationTargetStatus = 'active';
      return {
        ...user,
        reactivationTargetStatus,
      };
    }

    return user;
  }

  @Patch(':id')
  @WriteScope('action-edit-row', 'users')
  @ApiOperation({ summary: 'Update a user (scope-based access via assertUserAccess)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.update(id, req.user.company_id, dto, req.user.uid, req.actionScopes?.['action-edit-row']);
  }

  @Delete(':id')
  @WriteScope('action-delete-row', 'users')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.usersService.remove(id, req.user.company_id, req.user.uid, req.actionScopes?.['action-delete-row']);
  }

  @Patch(':id/vsc-reports-frequencies')
  @WriteScope('action-edit-vsc-config', 'volunteers')
  @ApiOperation({ summary: 'Update VSC automatic reports frequencies configuration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VSC reports frequencies updated' })
  async updateVscReportsFrequencies(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVscReportsFrequenciesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const canUpdateOthers = req.user.roles?.includes('admin') || req.user.roles?.includes('coordinator');
    if (id !== req.user.uid && !canUpdateOthers) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersVscConfigService.updateVscReportsFrequencies(id, dto.vscReportsFrequencies);
  }

  @Get(':id/vsc-reports-frequencies')
  @ApiOperation({ summary: 'Get VSC automatic reports frequencies configuration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VSC reports frequencies retrieved' })
  async getVscReportsFrequencies(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersVscConfigService.getVscReportsFrequencies(id);
  }
}
