import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SessionsService } from './sessions.service';
import { Session } from './entities/session.entity';
import { SessionConfig } from './entities/session-config.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { SessionReport } from './entities/session-report.entity';
import { SessionStatusHistory } from './entities/session-status-history.entity';
import { SessionStudentTutorPair } from './entities/session-student-tutor-pair.entity';
import { BinomeCoeur } from './entities/binome-coeur.entity';
import { Assignment } from './entities/assignment.entity';
import { VscReport } from './entities/vsc-report.entity';
import { Activity } from '../activity/entities/activity.entity';
import { UsersService } from '../users/users.service';
import { BinomeCoeurService } from './binome-coeur.service';
import { SchoolYear } from '../academic/entities/school-year.entity';
import { AuditLogService } from '../audit/audit.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionStatus } from './entities/session.entity';
import { UpdateSessionDto } from './dto/update-session.dto';
import { RecurrenceUpdateScope } from './dto/recurrence-update-scope.enum';
import { UpdateSessionReportDto } from './dto/update-session-report.dto';
import { UpdateSessionParticipantDto } from './dto/update-session-participant.dto';
import { CancelSessionReasonCode } from './dto/cancel-session.dto';
import { ActivityService } from '../activity/activity.service';
import { ActivityTypeService } from '../activity/activity-type.service';
import { Company } from '../companies/entities/company.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Room } from '../companies/entities/room.entity';
import { Holiday } from '../academic/entities/holiday.entity';
import { VacationZone } from '../academic/entities/vacation-zone.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import { TransactionalMailService } from '../mail/transactional-mail.service';
import { VscDailyReportsService } from './vsc-daily-reports.service';
import { GamificationService } from '../gamification/gamification.service';

const chainMock = () => ({ where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) });

const participantQueryChain = () => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
});
const assignmentQueryChain = () => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
});

const feedbackFor = (
  idAuteur: string,
  partial?: { rating?: number | null; comment?: string | null; feeling?: null },
) => [
  {
    idAuteur,
    rating: partial?.rating ?? null,
    comment: partial?.comment ?? null,
    feeling: partial?.feeling ?? null,
  },
];

describe('SessionsService', () => {
  let service: SessionsService;
  let module: TestingModule;
  let sessionRepository: jest.Mocked<Repository<Session>>;
  let sessionStatusHistoryRepository: jest.Mocked<Repository<SessionStatusHistory>>;
  let participantRepository: jest.Mocked<Repository<SessionParticipant>>;
  let studentTutorPairRepository: jest.Mocked<Repository<SessionStudentTutorPair>>;
  let assignmentRepository: jest.Mocked<Repository<Assignment>>;
  let sessionReportRepository: jest.Mocked<Repository<SessionReport>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let usersService: jest.Mocked<UsersService>;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'find' | 'findOne' | 'save'>>;
  let holidayGetMany: jest.Mock;
  let gamificationService: { tryAwardCrFirstSubmitXp: jest.Mock };

  const companyId = 'company-1';

  beforeEach(async () => {
    holidayGetMany = jest.fn().mockResolvedValue([]);
    module = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getRepositoryToken(Session),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(chainMock()),
          },
        },
        {
          provide: getRepositoryToken(SessionConfig),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(SessionParticipant),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockImplementation(participantQueryChain),
          },
        },
        {
          provide: getRepositoryToken(SessionReport),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(SessionStatusHistory),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(SessionStudentTutorPair),
          useValue: { find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(BinomeCoeur),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockImplementation(assignmentQueryChain),
          },
        },
        {
          provide: getRepositoryToken(VscReport),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(Activity),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(SchoolYear),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Company),
          useValue: { findOne: jest.fn().mockResolvedValue({ timezone: 'Europe/Paris' }) },
        },
        {
          provide: getRepositoryToken(Holiday),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: holidayGetMany,
            }),
          },
        },
        {
          provide: getRepositoryToken(VacationZone),
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'vz-1', companyId }) },
        },
        {
          provide: getRepositoryToken(Establishment),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn().mockImplementation((u: User) => Promise.resolve(u)),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        {
          provide: NotificationsService,
          useValue: { createIfNotDuplicate: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: {
            findUsersByEstablishmentAndRoleCodes: jest.fn().mockResolvedValue([]),
            getUserEstablishments: jest.fn().mockResolvedValue([]),
            recordStudentAccountStatusChange: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: VisibilityScopeResolverService,
          useValue: { resolveForRequest: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: BinomeCoeurService,
          useValue: { countCommonSessions: jest.fn().mockResolvedValue(0) },
        },
        {
          provide: ActivityService,
          useValue: { create: jest.fn() },
        },
        {
          provide: ActivityTypeService,
          useValue: { create: jest.fn() },
        },
        {
          provide: TransactionalMailService,
          useValue: { sendVscDailyReportAvailable: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: VscDailyReportsService,
          useValue: {
            reconcileAfterSessionChange: jest.fn().mockResolvedValue(undefined),
            reconcileOnSameDaySessionCreate: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: GamificationService,
          useValue: { tryAwardCrFirstSubmitXp: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    sessionRepository = module.get(getRepositoryToken(Session));
    sessionStatusHistoryRepository = module.get(getRepositoryToken(SessionStatusHistory));
    participantRepository = module.get(getRepositoryToken(SessionParticipant));
    studentTutorPairRepository = module.get(getRepositoryToken(SessionStudentTutorPair));
    assignmentRepository = module.get(getRepositoryToken(Assignment));
    sessionReportRepository = module.get(getRepositoryToken(SessionReport));
    auditLogService = module.get(AuditLogService);
    usersService = module.get(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    gamificationService = module.get(GamificationService);

    sessionRepository.find.mockResolvedValue([] as Session[]);
    userRepository.find.mockResolvedValue([] as User[]);
    participantRepository.find.mockResolvedValue([] as SessionParticipant[]);
    participantRepository.save.mockImplementation((e) =>
      Promise.resolve(e as SessionParticipant),
    );
    sessionReportRepository.findOne.mockResolvedValue(null);
    assignmentRepository.find.mockResolvedValue([] as Assignment[]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a session and audit', async () => {
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'homework_help',
        tutorIds: ['tutor-1'],
        studentIds: ['student-a'],
      };
      const created = { id: 's1', companyId, ...dto } as unknown as Session;
      sessionRepository.create.mockReturnValue(created);
      sessionRepository.save.mockResolvedValue(created);
      participantRepository.find.mockResolvedValue([]);
      participantRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionParticipant,
      );
      participantRepository.save.mockImplementation((p) => Promise.resolve(p as SessionParticipant));
      studentTutorPairRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionStudentTutorPair,
      );
      studentTutorPairRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SessionStudentTutorPair),
      );

      const result = await service.create(companyId, dto, 'user-1');

      expect(result).toEqual(created);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'sessions', action: 'CREATE' }),
      );
    });

    it('should create participants with attendanceStatus absent', async () => {
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'homework_help',
        tutorIds: ['tutor-1'],
        studentIds: ['student-a'],
        pairs: [{ studentUserId: 'student-a', tutorUserId: 'tutor-1' }],
      };
      const created = { id: 's1', companyId } as unknown as Session;
      sessionRepository.create.mockReturnValue(created);
      sessionRepository.save.mockResolvedValue(created);
      participantRepository.find.mockResolvedValue([]);
      participantRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionParticipant,
      );
      participantRepository.save.mockImplementation((p) => Promise.resolve(p as SessionParticipant));
      studentTutorPairRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionStudentTutorPair,
      );
      studentTutorPairRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SessionStudentTutorPair),
      );

      await service.create(companyId, dto, 'user-1');

      expect(participantRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 's1',
          userId: 'tutor-1',
          role: 'tutor',
          attendanceStatus: 'absent',
        }),
      );
    });

    it('should reject create without at least one tutor and one student', async () => {
      userRepository.find.mockResolvedValue([
        { id: 'tutor-1', companyId, userRoles: [{ role: { roleGroup: 'tutors', code: 'tutor' } }] },
      ] as User[]);
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'homework_help',
        tutorIds: ['tutor-1'],
      };

      await expect(service.create(companyId, dto)).rejects.toThrow(
        'Une séance de groupe doit comporter au moins un élève',
      );
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('should reject group session where a non-VSC tutor has no assigned student', async () => {
      userRepository.find.mockResolvedValue([
        { id: 'tutor-1', companyId, userRoles: [{ role: { roleGroup: 'tutors', code: 'tutor' } }] },
        { id: 'tutor-2', companyId, userRoles: [{ role: { roleGroup: 'tutors', code: 'tutor' } }] },
      ] as User[]);
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'workshop',
        tutorIds: ['tutor-1', 'tutor-2'],
        studentIds: ['student-a'],
        pairs: [{ studentUserId: 'student-a', tutorUserId: 'tutor-1' }],
      };

      await expect(service.create(companyId, dto)).rejects.toThrow(
        'Chaque tuteur doit être associé à au moins un élève.',
      );
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('should allow group session with floating VSC as volunteer on tutor session', async () => {
      userRepository.find.mockResolvedValue([
        { id: 'tutor-1', companyId, userRoles: [{ role: { roleGroup: 'tutors', code: 'tutor' } }] },
        {
          id: 'vsc-1',
          companyId,
          userRoles: [{ role: { roleGroup: 'volunteers', code: 'volunteer' } }],
        },
      ] as User[]);
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'workshop',
        tutorIds: ['tutor-1'],
        studentIds: ['student-a'],
        volunteerIds: ['vsc-1'],
        pairs: [{ studentUserId: 'student-a', tutorUserId: 'tutor-1' }],
      };
      const created = { id: 's1', companyId } as unknown as Session;
      sessionRepository.create.mockReturnValue(created);
      sessionRepository.save.mockResolvedValue(created);
      participantRepository.find.mockResolvedValue([]);
      participantRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionParticipant,
      );
      participantRepository.save.mockImplementation((p) => Promise.resolve(p as SessionParticipant));
      studentTutorPairRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionStudentTutorPair,
      );
      studentTutorPairRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SessionStudentTutorPair),
      );

      await service.create(companyId, dto, 'user-1');

      expect(sessionRepository.save).toHaveBeenCalled();
    });

    it('should reject dedicated group session with VSC only and no students', async () => {
      userRepository.find.mockResolvedValue([
        {
          id: 'vsc-1',
          companyId,
          userRoles: [{ role: { roleGroup: 'volunteers', code: 'volunteer' } }],
        },
      ] as User[]);
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'group_tutoring',
        tutorIds: ['vsc-1'],
        studentIds: [],
      };

      await expect(service.create(companyId, dto)).rejects.toThrow(
        'Une séance de groupe doit comporter au moins un élève',
      );
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('should persist pairs with session_type when tutors and students are on create dto', async () => {
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'homework_help',
        tutorIds: ['tutor-1'],
        studentIds: ['student-a'],
      };
      const created = { id: 's1', companyId } as unknown as Session;
      sessionRepository.create.mockReturnValue(created);
      sessionRepository.save.mockResolvedValue(created);
      participantRepository.find.mockResolvedValue([]);
      participantRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionParticipant,
      );
      participantRepository.save.mockImplementation((p) => Promise.resolve(p as SessionParticipant));
      studentTutorPairRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionStudentTutorPair,
      );
      studentTutorPairRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SessionStudentTutorPair),
      );

      await service.create(companyId, dto, 'user-1');

      expect(studentTutorPairRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 's1',
          sessionType: 'homework_help',
          studentUserId: 'student-a',
          tutorUserId: 'tutor-1',
        }),
      );
    });

    it('should reject create when planDuringHolidays is false and date overlaps a holiday', async () => {
      holidayGetMany.mockResolvedValueOnce([
        {
          id: 'h1',
          name: 'Vacances été',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-09-30'),
        },
      ]);
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'homework_help',
        planDuringHolidays: false,
        tutorIds: ['tutor-1'],
        studentIds: ['student-a'],
      };

      await expect(service.create(companyId, dto)).rejects.toThrow(BadRequestException);
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('should create when planDuringHolidays is true even if date overlaps a holiday', async () => {
      holidayGetMany.mockResolvedValueOnce([
        {
          id: 'h1',
          name: 'Vacances été',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-09-30'),
        },
      ]);
      const dto: CreateSessionDto = {
        establishmentId: 'est-1',
        schoolYearId: 'sy-1',
        sessionDate: '2024-09-15',
        startTime: '09:00',
        endTime: '10:00',
        type: 'homework_help',
        planDuringHolidays: true,
        tutorIds: ['tutor-1'],
        studentIds: ['student-a'],
      };
      const created = { id: 's1', companyId, ...dto } as unknown as Session;
      sessionRepository.create.mockReturnValue(created);
      sessionRepository.save.mockResolvedValue(created);
      participantRepository.find.mockResolvedValue([]);
      participantRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionParticipant,
      );
      participantRepository.save.mockImplementation((p) => Promise.resolve(p as SessionParticipant));
      studentTutorPairRepository.create.mockImplementation(
        (data: Record<string, unknown>) => data as unknown as SessionStudentTutorPair,
      );
      studentTutorPairRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SessionStudentTutorPair),
      );

      const result = await service.create(companyId, dto);

      expect(result).toEqual(created);
    });
  });

  describe('createBulk', () => {
    it('should reject entire bulk when any session fails participant rules (no partial create)', async () => {
      userRepository.find.mockResolvedValue([
        { id: 'tutor-1', companyId, userRoles: [{ role: { roleGroup: 'tutors', code: 'tutor' } }] },
        { id: 'tutor-2', companyId, userRoles: [{ role: { roleGroup: 'tutors', code: 'tutor' } }] },
      ] as User[]);

      const dtos: CreateSessionDto[] = [
        {
          establishmentId: 'est-1',
          schoolYearId: 'sy-1',
          sessionDate: '2024-09-15',
          startTime: '09:00',
          endTime: '10:00',
          type: 'workshop',
          tutorIds: ['tutor-1'],
          studentIds: ['student-a'],
          pairs: [{ studentUserId: 'student-a', tutorUserId: 'tutor-1' }],
        },
        {
          establishmentId: 'est-1',
          schoolYearId: 'sy-1',
          sessionDate: '2024-09-15',
          startTime: '09:00',
          endTime: '10:00',
          type: 'workshop',
          tutorIds: ['tutor-2'],
          studentIds: ['student-b'],
          pairs: [],
        },
      ];

      await expect(service.createBulk(companyId, dtos)).rejects.toThrow(
        'Chaque tuteur doit être associé à au moins un élève.',
      );
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when session not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('session access security (POC-113)', () => {
    const sessionId = 'session-1';
    const tutorUserId = 'tutor-1';
    const otherUserId = 'other-manager';

    const sessionAssignedToOther = {
      id: sessionId,
      companyId,
      managedById: otherUserId,
      establishmentId: 'est-1',
      roomId: null,
      sessionDate: new Date('2025-06-15'),
      startTime: '09:00',
      endTime: '10:00',
      status: SessionStatus.PLANNED,
    } as Session;

    const sessionAssignedToTutor = {
      ...sessionAssignedToOther,
      managedById: tutorUserId,
    } as Session;

    it('findOne: should throw ForbiddenException when tutor is not assigned to session', async () => {
      sessionRepository.findOne.mockResolvedValue(sessionAssignedToOther);
      sessionRepository.find.mockResolvedValue([]);
      sessionReportRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(sessionId, companyId, tutorUserId, ['TEACHER']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOne(sessionId, companyId, tutorUserId, ['TEACHER']),
      ).rejects.toThrow('You do not have access to this session');
    });

    it('findOne: should return session when user has ADMIN role', async () => {
      sessionRepository.findOne.mockResolvedValue(sessionAssignedToOther);
      sessionReportRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(sessionId, companyId, tutorUserId, ['ADMIN']);

      expect(result).toBeDefined();
      expect(result.id).toBe(sessionId);
    });

    it('findOne: should return session when user has COORDINATOR role', async () => {
      sessionRepository.findOne.mockResolvedValue(sessionAssignedToOther);
      sessionReportRepository.findOne.mockResolvedValue(null);
      usersService.getUserEstablishments.mockResolvedValue([{ id: 'est-1' }] as any);

      const result = await service.findOne(sessionId, companyId, tutorUserId, ['COORDINATOR']);

      expect(result).toBeDefined();
      expect(result.id).toBe(sessionId);
    });

    it('findOne: should return session when tutor is managed_by', async () => {
      sessionRepository.findOne.mockResolvedValue(sessionAssignedToTutor);
      sessionRepository.find.mockResolvedValue([{ id: sessionId }] as Session[]);
      sessionReportRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(sessionId, companyId, tutorUserId, ['TEACHER']);

      expect(result).toBeDefined();
      expect(result.id).toBe(sessionId);
    });
  });

  describe('update (status transition CANCELLED)', () => {
    const sessionId = 'session-1';
    const plannedSession = {
      id: sessionId,
      companyId,
      status: SessionStatus.PLANNED,
      sessionDate: new Date('2025-06-15'),
      startTime: '09:00',
      endTime: '10:00',
      roomId: null,
      managedById: null,
    } as Session;

    it('should allow PLANNED → CANCELLED via PATCH and record history', async () => {
      sessionRepository.findOne.mockResolvedValue(plannedSession);
      const savedCancelled = { ...plannedSession, status: SessionStatus.CANCELLED };
      sessionRepository.save.mockResolvedValue(savedCancelled);

      const dto: UpdateSessionDto = { status: SessionStatus.CANCELLED };
      const result = await service.update(sessionId, companyId, dto, 'user-1');

      expect(result.status).toBe(SessionStatus.CANCELLED);
      expect(sessionRepository.save).toHaveBeenCalled();
      expect(sessionStatusHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          fromStatus: SessionStatus.PLANNED,
          toStatus: SessionStatus.CANCELLED,
          triggerType: 'manual',
          actorId: 'user-1',
        }),
      );
      expect(sessionStatusHistoryRepository.save).toHaveBeenCalled();
      expect(sessionReportRepository.delete).toHaveBeenCalledWith({
        sessionId,
        companyId,
        status: 'to_complete',
      });
    });

    it('should throw BadRequestException when PATCH requests status other than CANCELLED', async () => {
      sessionRepository.findOne.mockResolvedValue(plannedSession);

      const dto: UpdateSessionDto = { status: SessionStatus.CLOSED };

      await expect(service.update(sessionId, companyId, dto, 'user-1')).rejects.toThrow(
        'Only cancellation (PLANNED → CANCELLED) is allowed via PATCH',
      );
      expect(sessionStatusHistoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update (recurrence following scope)', () => {
    beforeEach(() => {
      (sessionRepository as { manager?: unknown }).manager = {
        transaction: jest.fn(async (cb: (em: unknown) => Promise<unknown>) => {
          const em = {
            getRepository: (entity: unknown) => {
              if (entity === Session) {
                return {
                  findOne: sessionRepository.findOne,
                  save: sessionRepository.save,
                };
              }
              if (entity === SessionParticipant) {
                return participantRepository;
              }
              if (entity === SessionStudentTutorPair) {
                return studentTutorPairRepository;
              }
              return {
                findOne: sessionRepository.findOne,
                save: sessionRepository.save,
              };
            },
          };
          return cb(em);
        }),
      };
    });

    it('should reject following scope combined with status change', async () => {
      const recurring = {
        id: 's1',
        companyId,
        status: SessionStatus.PLANNED,
        sessionDate: new Date('2025-06-15'),
        startTime: '09:00',
        endTime: '10:00',
        roomId: null,
        managedById: null,
        recurrenceGroupId: 'g1',
        mode: 'recurring',
        recurrenceType: 'weekly',
        schoolYearId: 'sy-1',
        establishmentId: 'est-1',
        subjectIds: [],
        levelIds: [],
      } as unknown as Session;

      sessionRepository.findOne.mockResolvedValue(recurring);

      await expect(
        service.update('s1', companyId, {
          status: SessionStatus.CANCELLED,
          recurrenceUpdateScope: RecurrenceUpdateScope.FOLLOWING,
        }),
      ).rejects.toThrow(/recurrenceUpdateScope.*following.*status/i);
    });

    it('should update all sessions at or after anchor when following scope', async () => {
      const base = {
        companyId,
        schoolYearId: 'sy-1',
        establishmentId: 'est-1',
        recurrenceGroupId: 'g1',
        mode: 'recurring' as const,
        recurrenceType: 'weekly',
        subjectIds: [] as string[],
        subjectNames: [] as string[],
        levelIds: [] as string[],
        levelNames: [] as string[],
        roomId: null as string | null,
        managedById: null as string | null,
        activityId: null as string | null,
        status: SessionStatus.PLANNED,
        endTime: '10:00',
        type: 'homework_help' as const,
        sessionFormat: 'in_person' as const,
        topic: null as string | null,
      };
      const s1 = { id: 's1', ...base, sessionDate: new Date('2025-06-15'), startTime: '09:00' } as Session;
      const s2 = { id: 's2', ...base, sessionDate: new Date('2025-06-22'), startTime: '09:00' } as Session;

      sessionRepository.findOne.mockImplementation((opts: { where?: { id?: string }; relations?: string[] }) => {
        const sid = opts?.where?.id;
        if (sid === 's1' && opts.relations?.includes('establishment')) {
          return Promise.resolve({ ...s1, topic: 'new-topic', establishment: { id: 'est-1' } } as Session);
        }
        if (sid === 's1') return Promise.resolve({ ...s1 });
        if (sid === 's2') return Promise.resolve({ ...s2 });
        return Promise.resolve(null);
      });
      sessionRepository.find.mockResolvedValue([s1, s2]);
      sessionRepository.save.mockImplementation((e: Session) => Promise.resolve(e));

      const dto: UpdateSessionDto = {
        topic: 'new-topic',
        recurrenceUpdateScope: RecurrenceUpdateScope.FOLLOWING,
      };

      const result = await service.update('s1', companyId, dto, 'user-1');

      expect(sessionRepository.manager.transaction).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalledTimes(2);
      expect(auditLogService.log).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('s1');
    });
  });

  describe('updateSessionReport (status transition CLOSED)', () => {
    const sessionId = 'session-1';
    const reportId = 'report-1';
    const inProgressSession = {
      id: sessionId,
      companyId,
      status: SessionStatus.IN_PROGRESS,
      sessionDate: new Date('2025-06-15'),
      startTime: '09:00',
      endTime: '10:00',
      subjectIds: [] as string[],
    } as Session;
    const report = {
      id: reportId,
      sessionId,
      companyId,
      authorId: 'validator-1',
      status: 'submitted',
      validatedById: null,
      subjectIds: [] as string[],
      authorFeedbacks: feedbackFor('validator-1'),
    } as SessionReport;

    it('should transition session IN_PROGRESS → CLOSED when CR is validated and record history', async () => {
      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue(inProgressSession);
      participantRepository.find.mockResolvedValue([]);
      const savedReport = { ...report, status: 'validated' as const, validatedById: 'validator-1' };
      sessionReportRepository.save.mockResolvedValue(savedReport as SessionReport);
     const savedClosedSession = { ...inProgressSession, status: SessionStatus.CLOSED };
      sessionRepository.save.mockResolvedValue(savedClosedSession);

      const dto: UpdateSessionReportDto = { status: 'validated', validatedById: 'validator-1' };
      const result = await service.updateSessionReport(
        sessionId,
        reportId,
        companyId,
        dto,
        'validator-1',
      );

      expect(result.status).toBe('validated');
      expect(result.validatedById).toBe('validator-1');
      expect(sessionStatusHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          fromStatus: SessionStatus.IN_PROGRESS,
          toStatus: SessionStatus.CLOSED,
          triggerType: 'cr_validation',
          actorId: 'validator-1',
        }),
      );
      expect(sessionStatusHistoryRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateSessionReport (participant attendance)', () => {
    const sessionId = 'session-1';
    const reportId = 'report-1';
    const participantId = 'participant-1';
    const inProgressSession = {
      id: sessionId,
      companyId,
      status: SessionStatus.IN_PROGRESS,
      sessionDate: new Date('2030-06-15'),
      startTime: '09:00',
      endTime: '10:00',
      establishment: { id: 'est-1' },
      subjectIds: [] as string[],
    } as Session;
    const report = {
      id: reportId,
      sessionId,
      companyId,
      authorId: 'actor-1',
      status: 'draft',
      subject: null,
      subjectIds: [] as string[],
      authorFeedbacks: feedbackFor('actor-1'),
    } as SessionReport;
    const participant = {
      id: participantId,
      sessionId,
      userId: 'user-1',
      role: 'student',
      attendanceStatus: 'absent',
    } as SessionParticipant;

    it('should apply participant updates via participants payload', async () => {
      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue(inProgressSession);
      participantRepository.find.mockResolvedValue([]);
      participantRepository.findOne.mockResolvedValue(participant);
      const savedParticipant = { ...participant, attendanceStatus: 'present' as const };
      participantRepository.save.mockResolvedValue(savedParticipant as SessionParticipant);
      sessionReportRepository.save.mockImplementation((r) => Promise.resolve(r as SessionReport));

      const dto: UpdateSessionReportDto = {
        participants: [{ participantId, attendanceStatus: 'present' }],
      };
      await service.updateSessionReport(sessionId, reportId, companyId, dto, 'actor-1');

      expect(participantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: participantId, attendanceStatus: 'present' }),
      );
    });

    it('should apply participant updates via CR even when session is CLOSED', async () => {
      const closedSession = { ...inProgressSession, status: SessionStatus.CLOSED } as Session;
      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue(closedSession);
      participantRepository.find.mockResolvedValue([]);
      participantRepository.findOne.mockResolvedValue(participant);
      const savedParticipant = { ...participant, attendanceStatus: 'present' as const };
      participantRepository.save.mockResolvedValue(savedParticipant as SessionParticipant);
      sessionReportRepository.save.mockImplementation((r) => Promise.resolve(r as SessionReport));

      const dto: UpdateSessionReportDto = {
        participants: [{ participantId, attendanceStatus: 'present' }],
      };

      await service.updateSessionReport(sessionId, reportId, companyId, dto, 'actor-1');

      expect(participantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: participantId, attendanceStatus: 'present' }),
      );
    });

    it('should forward absenceComment when updating participant attendance via CR', async () => {
      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue(inProgressSession);
      participantRepository.find.mockResolvedValue([]);
      participantRepository.findOne.mockResolvedValue(participant);
      const savedParticipant = {
        ...participant,
        attendanceStatus: 'absent' as const,
        absenceJustification: 'Congé',
        absenceComment: 'Retard transport',
      };
      participantRepository.save.mockResolvedValue(savedParticipant as SessionParticipant);
      sessionReportRepository.save.mockImplementation((r) => Promise.resolve(r as SessionReport));

      const dto: UpdateSessionReportDto = {
        participants: [
          {
            participantId,
            attendanceStatus: 'absent',
            absenceJustification: 'Congé',
            absenceComment: 'Retard transport',
          },
        ],
      };

      await service.updateSessionReport(sessionId, reportId, companyId, dto, 'actor-1');

      expect(participantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: participantId,
          attendanceStatus: 'absent',
          absenceJustification: 'Congé',
          absenceComment: 'Retard transport',
        }),
      );
    });
  });

  describe('updateSessionReport (first submit XP)', () => {
    const sessionId = 'session-1';
    const reportId = 'report-1';

    it('calls tryAwardCrFirstSubmitXp when transitioning draft → submitted and actor is tutor', async () => {
      const report = {
        id: reportId,
        sessionId,
        companyId,
        authorId: 'tutor-1',
        status: 'draft',
        subject: 'Math',
        subjectIds: ['sid-1'],
        authorFeedbacks: feedbackFor('tutor-1', { rating: 4, comment: 'ok' }),
      } as SessionReport;
      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue({
        id: sessionId,
        companyId,
        type: 'individual_tutoring',
        status: SessionStatus.IN_PROGRESS,
        sessionDate: new Date('2030-06-15'),
        startTime: '09:00',
        endTime: '10:00',
        subjectIds: [],
      } as unknown as Session);
      participantRepository.find.mockResolvedValue([
        { userId: 'tutor-1', role: 'tutor' } as SessionParticipant,
      ]);
      participantRepository.count.mockResolvedValue(1);
      sessionReportRepository.save.mockImplementation((r) => Promise.resolve(r as SessionReport));

      await service.updateSessionReport(sessionId, reportId, companyId, { status: 'submitted' }, 'tutor-1');

      expect(participantRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sessionId, userId: 'tutor-1' }),
        }),
      );
      expect(gamificationService.tryAwardCrFirstSubmitXp).toHaveBeenCalledWith({
        companyId,
        sessionId,
        reportId,
        userId: 'tutor-1',
      });
    });

    it('does not call tryAwardCrFirstSubmitXp when already submitted', async () => {
      const report = {
        id: reportId,
        sessionId,
        companyId,
        authorId: 'tutor-1',
        status: 'submitted',
        subject: 'Math',
        subjectIds: ['sid-1'],
        authorFeedbacks: feedbackFor('tutor-1', { rating: 4, comment: 'ok' }),
      } as SessionReport;
      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue({
        id: sessionId,
        companyId,
        type: 'individual_tutoring',
        status: SessionStatus.IN_PROGRESS,
        sessionDate: new Date('2030-06-15'),
        startTime: '09:00',
        endTime: '10:00',
        subjectIds: [],
      } as unknown as Session);
      participantRepository.find.mockResolvedValue([
        { userId: 'tutor-1', role: 'tutor' } as SessionParticipant,
      ]);
      sessionReportRepository.save.mockImplementation((r) => Promise.resolve(r as SessionReport));
      gamificationService.tryAwardCrFirstSubmitXp.mockClear();

      await service.updateSessionReport(
        sessionId,
        reportId,
        companyId,
        {
          authorFeedbacks: [
            { idAuteur: 'tutor-1', comment: 'minor edit', rating: 4, feeling: null },
          ],
        },
        'tutor-1',
      );

      expect(gamificationService.tryAwardCrFirstSubmitXp).not.toHaveBeenCalled();
    });

    it('does not call tryAwardCrFirstSubmitXp when actor is not a tutor participant', async () => {
      const report = {
        id: reportId,
        sessionId,
        companyId,
        authorId: 'tutor-1',
        status: 'draft',
        subject: 'Math',
        subjectIds: ['sid-1'],
        authorFeedbacks: feedbackFor('tutor-1', { rating: 4, comment: 'ok' }),
      } as SessionReport;
      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue({
        id: sessionId,
        companyId,
        type: 'individual_tutoring',
        status: SessionStatus.IN_PROGRESS,
        sessionDate: new Date('2030-06-15'),
        startTime: '09:00',
        endTime: '10:00',
        subjectIds: [],
      } as unknown as Session);
      participantRepository.find.mockResolvedValue([
        { userId: 'tutor-1', role: 'tutor' } as SessionParticipant,
      ]);
      participantRepository.count.mockResolvedValue(0);
      sessionReportRepository.save.mockImplementation((r) => Promise.resolve(r as SessionReport));
      gamificationService.tryAwardCrFirstSubmitXp.mockClear();

      await service.updateSessionReport(sessionId, reportId, companyId, { status: 'submitted' }, 'random-user');

      expect(gamificationService.tryAwardCrFirstSubmitXp).not.toHaveBeenCalled();
    });
  });

  describe('updateSessionReport (authorFeedbacks)', () => {
    const sessionId = 'session-wc';
    const reportId = 'report-wc';

    it('submits when only the actor feedback is complete on whole_class', async () => {
      const session = {
        id: sessionId,
        companyId,
        type: 'whole_class',
        managedById: 'tutor-a',
        createdById: 'crt-1',
        status: SessionStatus.IN_PROGRESS,
        sessionDate: new Date('2030-06-15'),
        startTime: '09:00',
        endTime: '10:00',
        subjectIds: ['sid-1'],
      } as unknown as Session;
      const report = {
        id: reportId,
        sessionId,
        companyId,
        authorId: 'tutor-a',
        status: 'draft',
        subjectIds: ['sid-1'],
        authorFeedbacks: [
          { idAuteur: 'tutor-a', rating: 4, comment: 'ok', feeling: null },
          { idAuteur: 'tutor-b', rating: null, comment: null, feeling: null },
        ],
      } as SessionReport;

      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue(session);
      participantRepository.find.mockResolvedValue([
        { userId: 'tutor-a', role: 'tutor' } as SessionParticipant,
        { userId: 'tutor-b', role: 'tutor' } as SessionParticipant,
      ]);
      sessionReportRepository.save.mockImplementation((r) => Promise.resolve(r as SessionReport));

      const result = await service.updateSessionReport(sessionId, reportId, companyId, {}, 'tutor-a');

      expect(result.status).toBe('submitted');
    });

    it('rejects patch on another author slot for non-privileged user', async () => {
      const session = {
        id: sessionId,
        companyId,
        type: 'whole_class',
        managedById: 'tutor-a',
        createdById: 'crt-1',
        status: SessionStatus.IN_PROGRESS,
        sessionDate: new Date('2030-06-15'),
        startTime: '09:00',
        endTime: '10:00',
        subjectIds: [],
      } as unknown as Session;
      const report = {
        id: reportId,
        sessionId,
        companyId,
        authorId: 'tutor-a',
        status: 'draft',
        subjectIds: [],
        authorFeedbacks: [
          { idAuteur: 'tutor-a', rating: null, comment: null, feeling: null },
          { idAuteur: 'tutor-b', rating: null, comment: null, feeling: null },
        ],
      } as unknown as SessionReport;

      sessionReportRepository.findOne.mockResolvedValue(report);
      sessionRepository.findOne.mockResolvedValue(session);
      participantRepository.find.mockResolvedValue([
        { userId: 'tutor-a', role: 'tutor' } as SessionParticipant,
        { userId: 'tutor-b', role: 'tutor' } as SessionParticipant,
      ]);

      await expect(
        service.updateSessionReport(
          sessionId,
          reportId,
          companyId,
          {
            authorFeedbacks: [
              { idAuteur: 'tutor-b', rating: 5, comment: null, feeling: null },
            ],
          },
          'tutor-a',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSession (GLOBAL dematch)', () => {
    const sessionId = 'session-1';
    const plannedSession = {
      id: sessionId,
      companyId,
      status: SessionStatus.PLANNED,
      sessionDate: new Date('2025-06-15'),
      startTime: '09:00',
      endTime: '10:00',
      roomId: null,
      managedById: null,
    } as Session;

    it('should cancel session, remove all pairs, and record enriched history', async () => {
      sessionRepository.findOne
        .mockResolvedValueOnce(plannedSession)
        .mockResolvedValueOnce({ ...plannedSession, status: SessionStatus.CANCELLED });
      sessionRepository.save.mockResolvedValue({ ...plannedSession, status: SessionStatus.CANCELLED });
      studentTutorPairRepository.find.mockResolvedValue([
        { id: 'pair-1', sessionId } as SessionStudentTutorPair,
        { id: 'pair-2', sessionId } as SessionStudentTutorPair,
      ]);

      const result = await service.cancelSession(
        sessionId,
        companyId,
        { reasonCode: CancelSessionReasonCode.TUTOR_ABSENCE },
        'user-1',
      );

      expect(studentTutorPairRepository.delete).toHaveBeenCalledWith({ sessionId });
      expect(result.removedPairsCount).toBe(2);
      expect(result.session.status).toBe(SessionStatus.CANCELLED);
      expect(sessionStatusHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          fromStatus: SessionStatus.PLANNED,
          toStatus: SessionStatus.CANCELLED,
          triggerType: 'manual',
          actorId: 'user-1',
          reasonCode: CancelSessionReasonCode.TUTOR_ABSENCE,
          dematchMode: 'GLOBAL',
          removedPairsCount: 2,
        }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'sessions',
          action: 'UPDATE',
        }),
      );
      expect(sessionReportRepository.delete).toHaveBeenCalledWith({
        sessionId,
        companyId,
        status: 'to_complete',
      });
    });

    it('should reject OTHER without reasonDetail', async () => {
      sessionRepository.findOne.mockResolvedValue(plannedSession);
      await expect(
        service.cancelSession(
          sessionId,
          companyId,
          { reasonCode: CancelSessionReasonCode.OTHER, reasonDetail: '   ' },
          'user-1',
        ),
      ).rejects.toThrow('reasonDetail is required when reasonCode is OTHER');
    });

    it('should reject when session status is not PLANNED', async () => {
      sessionRepository.findOne.mockResolvedValue({
        ...plannedSession,
        status: SessionStatus.CLOSED,
      });
      studentTutorPairRepository.find.mockResolvedValue([]);

      await expect(
        service.cancelSession(
          sessionId,
          companyId,
          { reasonCode: CancelSessionReasonCode.WEATHER },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateParticipant (status transition IN_PROGRESS on first present)', () => {
    const sessionId = 'session-1';
    const participantId = 'participant-1';
    const plannedSession = {
      id: sessionId,
      companyId,
      status: SessionStatus.PLANNED,
      sessionDate: new Date('2030-06-15'),
      startTime: '09:00',
      endTime: '10:00',
    } as Session;
    const participant = {
      id: participantId,
      sessionId,
      userId: 'user-1',
      role: 'student',
      attendanceStatus: 'pending',
    } as SessionParticipant;

    it('should transition session PLANNED → IN_PROGRESS when participant marked present and record history', async () => {
      participantRepository.findOne.mockResolvedValue(participant);
      sessionRepository.findOne.mockResolvedValue(plannedSession);
      const savedParticipant = { ...participant, attendanceStatus: 'present' as const };
      participantRepository.save.mockResolvedValue(savedParticipant as SessionParticipant);
      const savedInProgressSession = { ...plannedSession, status: SessionStatus.IN_PROGRESS };
      sessionRepository.save.mockResolvedValue(savedInProgressSession);

      const dto: UpdateSessionParticipantDto = { attendanceStatus: 'present' };
      const result = await service.updateParticipant(
        sessionId,
        participantId,
        companyId,
        dto,
        'user-1',
      );

      expect(result.attendanceStatus).toBe('present');
      expect(sessionStatusHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          fromStatus: SessionStatus.PLANNED,
          toStatus: SessionStatus.IN_PROGRESS,
          triggerType: 'attendance',
          actorId: 'user-1',
        }),
      );
      expect(sessionStatusHistoryRepository.save).toHaveBeenCalled();
    });

    it('should not transition when participant is not marked present', async () => {
      participantRepository.findOne.mockResolvedValue(participant);
      sessionRepository.findOne.mockResolvedValue(plannedSession);
      const savedParticipant = { ...participant, attendanceStatus: 'absent' as const };
      participantRepository.save.mockResolvedValue(savedParticipant as SessionParticipant);

      const dto: UpdateSessionParticipantDto = { attendanceStatus: 'absent' };
      await service.updateParticipant(sessionId, participantId, companyId, dto, 'user-1');

      expect(sessionStatusHistoryRepository.create).not.toHaveBeenCalled();
    });

    it('should record student status history when registered student reaches accompanied threshold via presence', async () => {
      const studentUserId = 'student-registered-1';
      const participantRow = {
        id: participantId,
        sessionId,
        userId: studentUserId,
        role: 'student',
        attendanceStatus: 'pending',
      } as SessionParticipant;

      participantRepository.findOne
        .mockResolvedValueOnce(participantRow)
        .mockResolvedValueOnce({
          ...participantRow,
          attendanceStatus: 'present',
          user: { id: studentUserId },
        } as SessionParticipant);
      sessionRepository.findOne.mockResolvedValue(plannedSession);
      const savedParticipant = { ...participantRow, attendanceStatus: 'present' as const };
      participantRepository.save.mockResolvedValue(savedParticipant as SessionParticipant);
      sessionReportRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue({
        id: studentUserId,
        companyId,
        status: 'registered',
      } as User);
      participantRepository.count.mockResolvedValue(3);

      await service.updateParticipant(
        sessionId,
        participantId,
        companyId,
        { attendanceStatus: 'present' },
        'actor-admin-1',
      );

      expect(usersService.recordStudentAccountStatusChange).toHaveBeenCalledWith(
        companyId,
        studentUserId,
        'actor-admin-1',
        'registered',
        'accompanied',
        'auto_present_sessions',
      );
    });
  });

  describe('updateParticipant (absence comment)', () => {
    const sessionId = 'session-1';
    const participantId = 'participant-1';
    const participant = {
      id: participantId,
      sessionId,
      userId: 'user-1',
      role: 'student',
      attendanceStatus: 'pending',
      absenceJustification: null,
      absenceComment: null,
    } as SessionParticipant;
    const sessionRow = {
      id: sessionId,
      companyId,
      status: SessionStatus.PLANNED,
      sessionDate: new Date('2030-06-15'),
      startTime: '09:00',
      endTime: '10:00',
    } as Session;

    it('should persist absenceJustification and absenceComment when marking absent', async () => {
      participantRepository.findOne
        .mockResolvedValueOnce(participant)
        .mockResolvedValueOnce({
          ...participant,
          attendanceStatus: 'absent',
          absenceJustification: 'Congé',
          absenceComment: 'Retard transport',
          user: { id: 'user-1' },
        } as SessionParticipant);
      sessionRepository.findOne.mockResolvedValue(sessionRow);
      sessionReportRepository.findOne.mockResolvedValue(null);
      participantRepository.save.mockImplementation(async (row: SessionParticipant) => row);

      const result = await service.updateParticipant(
        sessionId,
        participantId,
        companyId,
        {
          attendanceStatus: 'absent',
          absenceJustification: 'Congé',
          absenceComment: 'Retard transport',
        },
        'user-1',
      );

      expect(participantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          attendanceStatus: 'absent',
          absenceJustification: 'Congé',
          absenceComment: 'Retard transport',
        }),
      );
      expect(result.absenceJustification).toBe('Congé');
      expect(result.absenceComment).toBe('Retard transport');
    });
  });

  describe('updateParticipant (POC-346: reject attendance when CR validated)', () => {
    const sessionId = 'session-1';
    const participantId = 'participant-1';
    const participant = {
      id: participantId,
      sessionId,
      userId: 'user-1',
      role: 'student',
      attendanceStatus: 'pending',
    } as SessionParticipant;
    const sessionRow = {
      id: sessionId,
      companyId,
      status: SessionStatus.CLOSED,
      sessionDate: new Date('2025-06-15'),
      startTime: '09:00',
      endTime: '10:00',
    } as Session;

    it('should throw ForbiddenException when session report is validated', async () => {
      participantRepository.findOne.mockResolvedValue(participant);
      sessionRepository.findOne.mockResolvedValue(sessionRow);
      sessionReportRepository.findOne.mockResolvedValue({
        id: 'report-1',
        status: 'validated',
        validatedById: null,
      } as SessionReport);

      const dto: UpdateSessionParticipantDto = { attendanceStatus: 'present' };

      await expect(
        service.updateParticipant(sessionId, participantId, companyId, dto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateParticipant(sessionId, participantId, companyId, dto, 'user-1'),
      ).rejects.toThrow('Le compte rendu est validé. Les présences ne peuvent plus être modifiées.');
      expect(participantRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('exportSessionsCsv', () => {
    it('returns a Buffer with valid .xlsx (PK) header', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            sessionDate: new Date('2024-10-15'),
            startTime: '09:00:00',
            endTime: '10:00:00',
            type: 'homework_help',
            status: 'completed',
            establishmentId: 'est-1',
            establishmentName: 'École A',
            roomId: 'room-1',
            roomName: 'Salle 1',
            schoolYear: { code: '2024-2025' },
          } as any,
        ]),
      };
      sessionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const buf = await service.exportSessionsCsv(companyId);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
    });

    it('returns a buffer with header row only when no sessions found', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      sessionRepository.createQueryBuilder.mockReturnValue(qb as any);

      const buf = await service.exportSessionsCsv(companyId);
      expect(Buffer.isBuffer(buf)).toBe(true);
    });
  });
});
