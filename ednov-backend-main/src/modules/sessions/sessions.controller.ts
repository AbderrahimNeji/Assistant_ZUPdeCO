import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  Res,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { LinkedElement } from '../../common/visibility/linked-element.decorator';
import { WithActionScopes, WriteScope } from '../../common/visibility/action-scope.decorator';
import { AuthenticatedRequest } from '../../auth/authenticated-request.interface';
import { SessionsService } from './sessions.service';
import { SessionsAiService } from './sessions-ai.service';
import { VscDailyReportsService } from './vsc-daily-reports.service';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ListVscReportsQueryDto } from './dto/list-vsc-reports-query.dto';
import { ListVscDailyReportsQueryDto, UpdateVscDailyReportDto } from './dto/vsc-daily-report.dto';
import { AttendanceHistoryQueryDto } from './dto/attendance-history-query.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateSessionParticipantDto } from './dto/create-session-participant.dto';
import { UpdateSessionParticipantDto } from './dto/update-session-participant.dto';
import { CreateSessionReportDto } from './dto/create-session-report.dto';
import { UpdateSessionReportDto } from './dto/update-session-report.dto';
import { CreateVscReportDto } from './dto/create-vsc-report.dto';
import { UpdateVscReportDto } from './dto/update-vsc-report.dto';
import { PutSessionConfigDto } from './dto/put-session-config.dto';
import { SetAssignmentsDto } from './dto/set-assignments.dto';
import { RunAutoAssignmentDto } from './dto/run-auto-assignment.dto';
import { ProposeDraftAutoAssignmentDto } from './dto/propose-draft-auto-assignment.dto';
import { AutoAssignmentProposalDto } from './dto/auto-assignment-proposal.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CancelSessionDto } from './dto/cancel-session.dto';
import { CheckTutorAvailabilityQueryDto } from './dto/check-tutor-availability-query.dto';
import { CheckTutorConflictQueryDto } from './dto/check-tutor-conflict-query.dto';
import { CheckRoomCapacityQueryDto } from './dto/check-room-capacity-query.dto';
import { CreateSessionsBulkDto } from './dto/create-sessions-bulk.dto';

@ApiTags('sessions')
@ApiBearerAuth('Firebase')
@Controller('sessions')
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsAiService: SessionsAiService,
    private readonly vscDailyReportsService: VscDailyReportsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a session' })
  create(@Body() dto: CreateSessionDto, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.create(req.user.company_id, dto, req.user?.uid);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Créer plusieurs séances en une seule requête',
    description:
      'Chaque élément du tableau utilise exactement le même body que la création individuelle ' +
      '(récurrence, participants, audit log, etc.). ' +
      'Les séances valides sont créées même si certaines échouent. ' +
      'Le résultat détaille le statut de chaque item.',
  })
  @ApiBody({ type: CreateSessionsBulkDto })
  @ApiResponse({
    status: 201,
    description: 'Résultats de la création en masse',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            total:   { type: 'number', description: 'Nombre total de séances soumises' },
            created: { type: 'number', description: 'Nombre de séances créées avec succès' },
            failed:  { type: 'number', description: 'Nombre de séances en erreur' },
          },
        },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index:  { type: 'number', description: 'Position dans le tableau d\'entrée (0-based)' },
              status: { type: 'string', enum: ['created', 'error'] },
              data:   { description: 'Séance(s) créée(s) — présent si status = created' },
              error:  { type: 'string', description: 'Message d\'erreur — présent si status = error' },
            },
          },
        },
      },
      example: {
        summary: { total: 3, created: 2, failed: 1 },
        results: [
          { index: 0, status: 'created', data: [{}] },
          { index: 1, status: 'error', error: 'Room is already booked for another session at this date/time' },
          { index: 2, status: 'created', data: [{}] },
        ],
      },
    },
  })
  createBulk(@Body() dto: CreateSessionsBulkDto, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.createBulk(req.user.company_id, dto.sessions, req.user?.uid);
  }

  @Get()
  @LinkedElement('menu-sessions', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'sessions' },
    { elementId: 'action-cancel-row', interfaceName: 'sessions' },
    { elementId: 'action-delete-row', interfaceName: 'sessions' },
    { elementId: 'action-manage-attendance', interfaceName: 'sessions' },
    { elementId: 'action-view-report', interfaceName: 'sessions' },
  ])
  @ApiOperation({ summary: 'List sessions (paginated; optional filters: dateFrom, dateTo, status, establishmentId, roomId, page, pageSize)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of sessions. Response shape: { data: Session[], total: number, page: number, pageSize: number }. Mobile clients use the "data" array.',
    schema: {
      type: 'object',
      required: ['data', 'total', 'page', 'pageSize'],
      properties: {
        data: { type: 'array', items: { type: 'object' }, description: 'Page of session items' },
        total: { type: 'number', description: 'Total count across all pages' },
        page: { type: 'number', description: 'Current page (1-based)' },
        pageSize: { type: 'number', description: 'Items per page' },
      },
    },
  })
  findAll(
    @Query() query: ListSessionsQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.findAll(
      req.user.company_id,
      query,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
      req.actionScopes,
    );
  }

  @Get('report-kpis')
  @ApiOperation({
    summary:
      'Report KPIs (missing, overdue, pendingReports, submitted, validated). Scoped to tutor/volunteer/VSC sessions when applicable.',
  })
  getReportKpis(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.getReportKpis(req.user.company_id, req.user?.uid, req.user?.roles);
  }

  @Get('reports')
  @LinkedElement('menu-reports', 'sidebar')
  @ApiOperation({
    summary: 'List session reports for the company',
    description:
      'Returns only reports whose session has started (company timezone: scheduled start <= now): past or in-progress sessions; future sessions are excluded. Other query filters apply on top of that.',
  })
  async findAllReports(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListReportsQueryDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (query?.exportCsv || query?.exportExcel) {
      const buffer = await this.sessionsService.exportReportsCsv(
        req.user.company_id,
        query,
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
        `attachment; filename="reports-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      );
      res.send(buffer);
      return;
    }
    const data = await this.sessionsService.findAllReports(
      req.user.company_id,
      query,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
    );
    res.status(HttpStatus.OK).json(data);
  }

  @Get('dashboard/coordinator')
  @ApiOperation({ summary: 'Coordinator dashboard: today’s sessions and report KPIs' })
  getCoordinatorDashboard(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.getCoordinatorDashboard(req.user.company_id);
  }

  @Get('dashboard/tutor')
  @ApiOperation({ summary: 'Tutor dashboard: upcoming sessions and reports to submit' })
  getTutorDashboard(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.getTutorDashboard(
      req.user.company_id,
      req.user.uid,
    );
  }

  @Get('attendance-history')
  @ApiOperation({ summary: 'Tutor attendance history: past sessions with participants' })
  getAttendanceHistory(
    @Query() query: AttendanceHistoryQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.getTutorAttendanceHistory(
      req.user.company_id,
      req.user.uid,
      query,
    );
  }

  @Get('analytics/students')
  @ApiOperation({ summary: 'Student performance KPIs (sessions count, present count)' })
  getStudentKpis(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.getStudentKpis(req.user.company_id);
  }

  @Get('analytics/tutors')
  @ApiOperation({ summary: 'Tutor performance KPIs (sessions count, reports submitted)' })
  getTutorKpis(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.getTutorKpis(req.user.company_id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export sessions as Excel (.xlsx) (optional query filters)' })
  async exportSessions(
    @Query() query: ListSessionsQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const buffer = await this.sessionsService.exportSessionsCsv(
      req.user.company_id,
      query,
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
      `attachment; filename="sessions-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get session config for the current company' })
  getSessionConfig(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.getSessionConfig(req.user.company_id);
  }

  @Put('config')
  @ApiOperation({ summary: 'Create or update session config for the current company' })
  putSessionConfig(
    @Body() dto: PutSessionConfigDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.putSessionConfig(
      req.user.company_id,
      dto,
      req.user?.uid,
    );
  }

  @Get('vsc-reports')
  @LinkedElement('menu-vsc-reports', 'sidebar')
  @ApiOperation({ summary: 'List all VSC reports (across all sessions)' })
  async findAllVscReports(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListVscReportsQueryDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (query?.exportCsv || query?.exportExcel) {
      const buffer = await this.sessionsService.exportVscReportsCsv(
        req.user.company_id,
        query,
        req.user?.uid,
        req.user?.roles,
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="vsc-reports-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      );
      res.send(buffer);
      return;
    }
    const data = await this.sessionsService.findAllVscReports(
      req.user.company_id,
      query,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
    );
    res.status(HttpStatus.OK).json(data);
  }

  @Get('vsc-daily-reports')
  @LinkedElement('menu-vsc-reports', 'sidebar')
  @ApiOperation({ summary: 'List per-establishment VSC daily reports (pre-generated; visible_at from schedule)' })
  async listVscDailyReports(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListVscDailyReportsQueryDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (query?.exportCsv || query?.exportExcel) {
      const buffer = await this.vscDailyReportsService.exportDailyReportsExcel(
        req.user.company_id,
        query,
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
        `attachment; filename="vsc-daily-reports-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      );
      res.send(buffer);
      return;
    }
    const data = await this.vscDailyReportsService.list(
      req.user.company_id,
      query,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
    );
    res.status(HttpStatus.OK).json(data);
  }

  @Get('vsc-daily-reports/:reportId')
  @LinkedElement('menu-vsc-reports', 'sidebar')
  @ApiOperation({ summary: 'Get one VSC daily report' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  getVscDailyReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vscDailyReportsService.findOne(
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Patch('vsc-daily-reports/:reportId')
  @LinkedElement('menu-vsc-reports', 'sidebar')
  @ApiOperation({ summary: 'Update VSC daily report (rating, comment; submit)' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  patchVscDailyReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateVscDailyReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vscDailyReportsService.updateReport(
      reportId,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Patch('vsc-daily-reports/:reportId/validate')
  @LinkedElement('menu-vsc-reports', 'sidebar')
  @ApiOperation({ summary: 'Validate a submitted VSC daily report (coordinator / admin / manager)' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  validateVscDailyReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vscDailyReportsService.validateReport(
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Delete('vsc-daily-reports/:reportId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @LinkedElement('menu-vsc-reports', 'sidebar')
  @ApiOperation({ summary: 'Delete a VSC daily report' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  removeVscDailyReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vscDailyReportsService.removeReport(
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  /** GET /api/v1/sessions/ai/health — no auth. Use to confirm backend (not Expo) is on this port. */
  @Public()
  @Get('ai/health')
  @ApiOperation({ summary: 'Health check for sessions AI routes (no auth)' })
  sessionsAiHealth() {
    return { ok: true, routes: ['POST /ai/session-chat', 'POST :id/ai/generate-from-recording'] };
  }

  @Post(':id/ai/generate-from-recording')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiOperation({ summary: 'Upload session recording; transcribe (STT) and generate draft CR + pedagogical resources' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Session ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio'],
      properties: {
        audio: { type: 'string', format: 'binary', description: 'Audio file (e.g. WAV, M4A, MP3)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Draft CR and resources generated' })
  @ApiResponse({ status: 400, description: 'No audio file' })
  @ApiResponse({ status: 502, description: 'STT or LLM failed' })
  async generateFromRecording(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file provided (field: audio)');
    }
    return this.sessionsAiService.generateFromRecording(
      id,
      req.user.company_id,
      req.user.uid,
      req.user?.roles ?? [],
      file,
    );
  }

  @Get('check-tutor-availability')
  @ApiOperation({
    summary: 'Check whether a tutor has a conflicting session at a given date/time slot (read-only)',
  })
  checkTutorAvailability(
    @Request() req: AuthenticatedRequest,
    @Query() query: CheckTutorAvailabilityQueryDto,
  ) {
    return this.sessionsService.checkTutorAvailability(
      req.user.company_id,
      query.tutorId,
      query.sessionDate,
      query.startTime,
      query.endTime,
      query.excludeSessionId,
    );
  }

  @Get('tutor-conflict-check')
  @ApiOperation({ summary: 'Check if a tutor participant is already booked for a given date/time slot' })
  async checkTutorConflict(
    @Request() req: AuthenticatedRequest,
    @Query() query: CheckTutorConflictQueryDto,
  ) {
    const conflict = await this.sessionsService.checkTutorParticipantConflict(
      req.user.company_id,
      query.tutorId,
      query.sessionDate,
      query.startTime,
      query.endTime,
      query.excludeSessionId ?? null,
    );
    return { hasConflict: !!conflict, conflictingSession: conflict ?? undefined };
  }

  @Get('check-room-capacity')
  @ApiOperation({
    summary: 'Vérifier la disponibilité d\'une salle selon sa capacité pour un créneau donné',
    description:
      'Calcule le nombre total de participants déjà inscrits dans la salle sur le créneau (date + heure début/fin), ' +
      'en tenant compte de toutes les séances actives (hors CANCELLED et CLOSED) qui se chevauchent. ' +
      'Additionne ce total avec le nombre de participants à ajouter et compare à la capacité maximale de la salle. ' +
      'Si la capacité est dépassée, retourne `available: false` avec un message explicatif.',
  })
  @ApiQuery({ name: 'roomId', type: 'string', format: 'uuid', description: 'ID de la salle à vérifier' })
  @ApiQuery({ name: 'participantsToAdd', type: 'number', description: 'Nombre de participants à ajouter (≥ 1)' })
  @ApiQuery({ name: 'sessionDate', type: 'string', example: '2026-05-10', description: 'Date de la séance (YYYY-MM-DD)' })
  @ApiQuery({ name: 'startTime', type: 'string', example: '14:00', description: 'Heure de début (HH:mm ou HH:mm:ss)' })
  @ApiQuery({ name: 'endTime', type: 'string', example: '16:00', description: 'Heure de fin (HH:mm ou HH:mm:ss)' })
  @ApiQuery({ name: 'excludeSessionId', type: 'string', format: 'uuid', required: false, description: 'ID de la séance à exclure du calcul (utile lors de la modification d\'une séance existante)' })
  @ApiResponse({
    status: 200,
    description: 'Résultat de la vérification de capacité',
    schema: {
      type: 'object',
      properties: {
        available: {
          type: 'boolean',
          description: '`true` si la salle peut accueillir les participants supplémentaires, `false` sinon',
        },
        roomName: {
          type: 'string',
          description: 'Nom (ou libellé) de la salle',
        },
        capacity: {
          type: 'number',
          nullable: true,
          description: 'Capacité maximale de la salle (null si non renseignée)',
        },
        currentParticipants: {
          type: 'number',
          description: 'Nombre de participants déjà inscrits dans la salle sur ce créneau',
        },
        participantsToAdd: {
          type: 'number',
          description: 'Nombre de participants à ajouter (tel que passé en paramètre)',
        },
        totalIfAdded: {
          type: 'number',
          description: 'Total de participants si l\'ajout est effectué (currentParticipants + participantsToAdd)',
        },
        remaining: {
          type: 'number',
          nullable: true,
          description: 'Places restantes dans la salle avant l\'ajout (null si capacité non renseignée)',
        },
        message: {
          type: 'string',
          description: 'Message explicatif présent uniquement si `available` est `false`',
        },
      },
      example: {
        available: false,
        roomName: 'Salle A',
        capacity: 20,
        currentParticipants: 18,
        participantsToAdd: 5,
        totalIfAdded: 23,
        remaining: 2,
        message: 'La salle "Salle A" ne peut pas accueillir 5 participant(s) supplémentaire(s). Capacité maximale : 20, participants déjà présents sur ce créneau : 18, total demandé : 23.',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Salle introuvable pour cet ID' })
  checkRoomCapacity(
    @Request() req: AuthenticatedRequest,
    @Query() query: CheckRoomCapacityQueryDto,
  ) {
    return this.sessionsService.checkRoomCapacity(
      req.user.company_id,
      query.roomId,
      query.participantsToAdd,
      query.sessionDate,
      query.startTime,
      query.endTime,
      query.excludeSessionId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.findOne(
      id,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Patch(':id')
  @WriteScope('action-edit-row', 'sessions')
  @ApiOperation({ summary: 'Update a session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.update(
      id,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
      req.actionScopes?.['action-edit-row'],
    );
  }

  @Post(':id/cancel')
  @WriteScope('action-cancel-row', 'sessions')
  @ApiOperation({ summary: 'Cancel a session with mandatory reason (GLOBAL dematch)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSessionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.cancelSession(
      id,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
      req.actionScopes?.['action-cancel-row'],
    );
  }

  @Delete(':id')
  @WriteScope('action-delete-row', 'sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.remove(
      id,
      req.user.company_id,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
      req.actionScopes?.['action-delete-row'],
    );
  }

  @Get('student-tutor-pairs')
  @LinkedElement('menu-matching', 'sidebar')
  @ApiOperation({ summary: 'List all student-tutor pairs across all sessions (for matching interface)' })
  @ApiResponse({ status: 200, description: 'List of student-tutor pairs with session, student, and tutor details' })
  getAllStudentTutorPairs(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ) {
    return this.sessionsService.getAllStudentTutorPairs(
      req.user.company_id,
      query,
      req.user?.uid,
      req.user?.roles,
      req.visibilityScope,
    );
  }

  @Get('student-tutor-pairs/:id')
  @ApiOperation({ summary: 'Get a single student-tutor pair by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Student-tutor pair details' })
  getStudentTutorPair(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.getStudentTutorPair(
      req.user.company_id,
      id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Get(':id/assignment-candidates')
  @ApiOperation({ summary: 'Get students and tutors eligible for assignment (same establishment, subject, availability)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getAssignmentCandidates(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.getAssignmentCandidates(
      id,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Put(':id/assignments')
  @ApiOperation({ summary: 'Set manual student–tutor pairs for the session (replaces existing)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Assignments updated' })
  setAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAssignmentsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.setAssignments(
      id,
      req.user.company_id,
      dto.pairs,
      dto.participants,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Post(':id/assignments/auto')
  @ApiOperation({ summary: 'Run auto-assignment (keeps manual pairs, fills remaining with binôme cœur then balanced)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Assignments updated' })
  runAutoAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RunAutoAssignmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.runAutoAssignment(
      id,
      req.user.company_id,
      dto.participants,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Post(':id/assignments/auto/propose')
  @ApiOperation({
    summary: 'Propose auto-assignment without persisting — returns candidate pairs by session type',
    description: [
      'Runs the same 3-level algorithm as the auto-assignment endpoint (binôme cœur, history, balanced)',
      'but does NOT save any pairs or participants.',
      '',
      'The pairing constraints depend on session.type:',
      '  • individual_tutoring → maxStudentsPerTutor forced to 1 (strict 1 tutor : 1 student)',
      '  • homework_help / workshop / group_tutoring → maxStudentsPerTutor from activity (default 10)',
      '  • whole_class → all eligible tutors paired with all eligible students (N:N cross-product)',
    ].join('\n'),
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: AutoAssignmentProposalDto, description: 'Proposed pairs (not persisted)' })
  proposeAutoAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RunAutoAssignmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.proposeAutoAssignment(
      id,
      req.user.company_id,
      dto.participants,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Post('assignments/auto/propose-draft')
  @ApiOperation({
    summary: 'Propose auto-assignment for a NOT-YET-CREATED session — returns candidate pairs',
    description: [
      'Same 3-level algorithm as `/sessions/:id/assignments/auto/propose`, but for a session',
      'that does not exist in DB yet (création flow). The client provides the full session',
      'context (sessionType, establishmentId, subjectId, activityId, participants) and the',
      'service returns the proposed pairs without persisting anything.',
    ].join('\n'),
  })
  @ApiResponse({
    status: 201,
    type: AutoAssignmentProposalDto,
    description: 'Proposed pairs for a draft session (not persisted)',
  })
  proposeAutoAssignmentDraft(
    @Body() dto: ProposeDraftAutoAssignmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.proposeAutoAssignmentDraft(req.user.company_id, dto);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'List session participants' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findParticipants(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.findParticipants(
      id,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add a session participant' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSessionParticipantDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.createParticipant(
      id,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Get(':id/participants/:participantId')
  @ApiOperation({ summary: 'Get session participant by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'participantId', type: 'string', format: 'uuid' })
  findOneParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.findOneParticipant(
      id,
      participantId,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Patch(':id/participants/:participantId')
  @ApiOperation({ summary: 'Update a session participant' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'participantId', type: 'string', format: 'uuid' })
  updateParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Body() dto: UpdateSessionParticipantDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.updateParticipant(
      id,
      participantId,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Delete(':id/participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a session participant' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'participantId', type: 'string', format: 'uuid' })
  removeParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.removeParticipant(
      id,
      participantId,
      req.user.company_id,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Get(':id/reports')
  @ApiOperation({ summary: 'List session reports' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'reports' },
    { elementId: 'action-validate-row', interfaceName: 'reports' },
    { elementId: 'action-delete-row', interfaceName: 'reports' },
  ])
  findReports(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.findReports(
      id,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Post(':id/reports')
  @ApiOperation({ summary: 'Create a session report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createSessionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSessionReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.createSessionReport(
      id,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Get(':id/reports/:reportId')
  @ApiOperation({ summary: 'Get session report by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  findOneSessionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.findOneSessionReport(
      id,
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Patch(':id/reports/:reportId')
  @ApiOperation({ summary: 'Update a session report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  @WriteScope('action-edit-row', 'reports')
  updateSessionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateSessionReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.updateSessionReport(
      id,
      reportId,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
      req.actionScopes?.['action-edit-row'],
    );
  }

  @Patch(':id/reports/:reportId/validate')
  @ApiOperation({ summary: 'Validate a session report (Coordinators only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  @WriteScope('action-validate-row', 'reports')
  validateSessionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.validateSessionReport(
      id,
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
      req.actionScopes?.['action-validate-row'],
    );
  }

  // POC-323: Validation VSC reports
  @Patch(':id/vsc-reports/:reportId/validate')
  @ApiOperation({ summary: 'Validate a VSC report (Coordinator, Admin, Manager)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Session ID' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid', description: 'VSC Report ID' })
  @ApiResponse({ status: 200, description: 'VSC report validated successfully' })
  @ApiResponse({ status: 404, description: 'VSC report not found' })
  @ApiResponse({ status: 400, description: 'Report is not in submitted status' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  validateVscReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.validateVscReport(
      id,
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  // POC-328: Export rapports Excel
  @Get('reports/export')
  @ApiOperation({ summary: 'Export reports as Excel (Admin, Manager, Coordinator)' })
  @ApiQuery({ name: 'exportFormat', required: false, enum: ['excel'], description: 'Export format' })
  async exportReports(
    @Query('exportFormat') exportFormat: string,
    @Query() query: any,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (exportFormat === 'excel') {
      const buffer = await this.sessionsService.exportReportsExcel(
        req.user.company_id,
        query,
        req.user?.uid,
        req.user?.roles,
      );
      const filename = `reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      return res.send(buffer);
    }
    throw new BadRequestException('Only excel export format is currently supported');
  }

  @Delete(':id/reports/:reportId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a session report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  @WriteScope('action-delete-row', 'reports')
  removeSessionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.removeSessionReport(
      id,
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
      req.actionScopes?.['action-delete-row'],
    );
  }

  @Get(':id/vsc-reports')
  @ApiOperation({ summary: 'List VSC reports for a session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'vsc-reports' },
    { elementId: 'action-validate-row', interfaceName: 'vsc-reports' },
    { elementId: 'action-delete-row', interfaceName: 'vsc-reports' },
  ])
  findVscReports(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.findVscReports(
      id,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Post(':id/vsc-reports')
  @ApiOperation({ summary: 'Create a VSC report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createVscReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVscReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.createVscReport(
      id,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Get(':id/vsc-reports/:reportId')
  @ApiOperation({ summary: 'Get VSC report by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  findOneVscReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.findOneVscReport(
      id,
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.roles,
    );
  }

  @Patch(':id/vsc-reports/:reportId')
  @ApiOperation({ summary: 'Update a VSC report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  @WriteScope('action-edit-row', 'vsc-reports')
  updateVscReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateVscReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.updateVscReport(
      id,
      reportId,
      req.user.company_id,
      dto,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
      req.actionScopes?.['action-edit-row'],
    );
  }

  @Delete(':id/vsc-reports/:reportId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a VSC report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reportId', type: 'string', format: 'uuid' })
  @WriteScope('action-delete-row', 'vsc-reports')
  removeVscReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.removeVscReport(
      id,
      reportId,
      req.user.company_id,
      req.user?.uid,
      req.user?.uid,
      req.user?.roles,
      req.actionScopes?.['action-delete-row'],
    );
  }
}
