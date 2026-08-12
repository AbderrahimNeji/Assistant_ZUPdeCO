import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Session } from '../sessions/entities/session.entity';
import { SessionReport } from '../sessions/entities/session-report.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { VscReport } from '../sessions/entities/vsc-report.entity';
import { User } from '../users/entities/user.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import { DashboardStatDto } from './dto/dashboard-stats-response.dto';
import { SessionStatus } from '../sessions/entities/session.entity';

describe('DashboardService — KPI abandons & heures collectives', () => {
  let service: DashboardService;
  let dropoutFormatSpy: jest.SpyInstance;
  let studentsBySessionFilterSpy: jest.SpyInstance;
  let tutorDropoutsSpy: jest.SpyInstance;
  let avgVscContractSpy: jest.SpyInstance;
  let resolveEstablishmentIds: jest.Mock;

  const repoMock = () => ({
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    }),
    manager: {
      query: jest.fn().mockResolvedValue([{ count: '0', total_hours: '0' }]),
    },
  });

  beforeEach(async () => {
    resolveEstablishmentIds = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Session), useValue: repoMock() },
        { provide: getRepositoryToken(SessionReport), useValue: repoMock() },
        { provide: getRepositoryToken(SessionParticipant), useValue: repoMock() },
        { provide: getRepositoryToken(VscReport), useValue: repoMock() },
        { provide: getRepositoryToken(User), useValue: repoMock() },
        { provide: getRepositoryToken(Establishment), useValue: repoMock() },
        {
          provide: VisibilityScopeResolverService,
          useValue: {
            compileRulesToScope: jest.fn((x: unknown) => x),
            resolveEstablishmentIds,
            resolveAssignedSessionIds: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardService);

    dropoutFormatSpy = jest
      .spyOn(service as unknown as { countDropoutsBySessionFormat: jest.Mock }, 'countDropoutsBySessionFormat')
      .mockImplementation(
        async (_companyId: string, _scopeFilter: unknown, format: 'in_person' | 'remote') =>
          format === 'in_person' ? 11 : 22,
      );

    studentsBySessionFilterSpy = jest
      .spyOn(
        service as unknown as { countStudentsBySessionFilter: jest.Mock },
        'countStudentsBySessionFilter',
      )
      .mockImplementation(
        async (
          _companyId: string,
          _query: unknown,
          _scopeFilter: unknown,
          filters: { format?: string },
        ) => (filters.format === 'remote' ? 33 : 0),
      );

    tutorDropoutsSpy = jest
      .spyOn(service as unknown as { countTutorDropouts: jest.Mock }, 'countTutorDropouts')
      .mockResolvedValue(7);

    avgVscContractSpy = jest
      .spyOn(
        service as unknown as { getAverageVscContractDurationMonths: jest.Mock },
        'getAverageVscContractDurationMonths',
      )
      .mockResolvedValue(11.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('expose stat-dropouts-inperson, stat-dropouts-online et stat-hours-collective dans getDashboardStats', async () => {
    const res = await service.getDashboardStats(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      {},
      'user-uid',
      null,
    );

    const inPerson = res.stats['stat-dropouts-inperson'] as DashboardStatDto;
    const online = res.stats['stat-dropouts-online'] as DashboardStatDto;
    const studentsOnline = res.stats['stat-students-online'] as DashboardStatDto;
    const hoursColl = res.stats['stat-hours-collective'] as DashboardStatDto;
    const tutorDropouts = res.stats['stat-volunteers-dropouts'] as DashboardStatDto;
    const avgVscContract = res.stats['stat-civicservice-avg-contract'] as DashboardStatDto;
    const tutorsActive = res.stats['stat-tutors-active'] as DashboardStatDto;

    expect(inPerson).toBeDefined();
    expect(inPerson.value).toBe(11);

    expect(online).toBeDefined();
    expect(online.value).toBe(22);

    expect(studentsOnline).toBeDefined();
    expect(studentsOnline.value).toBe(33);
    expect(studentsOnline.description).toContain('à distance');

    expect(hoursColl).toBeDefined();
    expect(typeof hoursColl.value).toBe('number');

    expect(tutorDropouts).toBeDefined();
    expect(tutorDropouts.value).toBe(7);
    expect(tutorDropouts.description).toBe(
      "Tuteurs désactivés avant leur date de fin d'engagement",
    );

    expect(tutorsActive).toBeDefined();
    expect(tutorsActive.description).toBe('Bénévoles actifs (rôle tuteur, statut actif)');
    expect(res.stats['stat-volunteers-total']).toBeUndefined();

    expect(tutorDropoutsSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      {},
      expect.objectContaining({ kind: 'unrestricted' }),
    );

    expect(avgVscContract).toBeDefined();
    expect(avgVscContract.value).toBe(11.5);
    expect(avgVscContract.description).toBe(
      'Durée moyenne de contrat (mois), VSC actifs',
    );
    expect(avgVscContractSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      {},
      expect.objectContaining({ kind: 'unrestricted' }),
    );

    expect(dropoutFormatSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      expect.objectContaining({ kind: 'unrestricted' }),
      'in_person',
    );
    expect(dropoutFormatSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      expect.objectContaining({ kind: 'unrestricted' }),
      'remote',
    );

    expect(studentsBySessionFilterSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      {},
      expect.objectContaining({ kind: 'unrestricted' }),
      { format: 'remote' },
    );
  });

  it('applique establishment_ids quand visibilityScope menu = same_establishment (coordinateur / VSC / manager / prof)', async () => {
    resolveEstablishmentIds.mockResolvedValue(['establishment-a', 'establishment-b']);

    await service.getDashboardStats(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      {},
      'user-coordinator',
      { scope: 'same_establishment', relations: ['establishment'] },
    );

    expect(resolveEstablishmentIds).toHaveBeenCalledWith(
      'user-coordinator',
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
    );

    expect(dropoutFormatSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      expect.objectContaining({
        kind: 'establishment_ids',
        ids: ['establishment-a', 'establishment-b'],
      }),
      'in_person',
    );
    expect(dropoutFormatSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      expect.objectContaining({
        kind: 'establishment_ids',
        ids: ['establishment-a', 'establishment-b'],
      }),
      'remote',
    );

    expect(tutorDropoutsSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      {},
      expect.objectContaining({
        kind: 'establishment_ids',
        ids: ['establishment-a', 'establishment-b'],
      }),
    );

    expect(avgVscContractSpy).toHaveBeenCalledWith(
      '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
      {},
      expect.objectContaining({
        kind: 'establishment_ids',
        ids: ['establishment-a', 'establishment-b'],
      }),
    );
  });
});

describe('DashboardService — stat-sessions-hours', () => {
  let service: DashboardService;
  let sessionFind: jest.Mock;

  const repoMock = () => ({
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    }),
    manager: {
      query: jest.fn().mockResolvedValue([{ count: '0', total_hours: '0' }]),
    },
  });

  beforeEach(async () => {
    sessionFind = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Session),
          useValue: { ...repoMock(), find: sessionFind },
        },
        { provide: getRepositoryToken(SessionReport), useValue: repoMock() },
        { provide: getRepositoryToken(SessionParticipant), useValue: repoMock() },
        { provide: getRepositoryToken(VscReport), useValue: repoMock() },
        { provide: getRepositoryToken(User), useValue: repoMock() },
        { provide: getRepositoryToken(Establishment), useValue: repoMock() },
        {
          provide: VisibilityScopeResolverService,
          useValue: {
            compileRulesToScope: jest.fn((x: unknown) => x),
            resolveEstablishmentIds: jest.fn().mockResolvedValue([]),
            resolveAssignedSessionIds: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardService);

    jest.spyOn(service as unknown as { calculateCompletedSessions: jest.Mock }, 'calculateCompletedSessions').mockResolvedValue(0);
    jest.spyOn(service as unknown as { getSessionsByStatus: jest.Mock }, 'getSessionsByStatus').mockResolvedValue({
      planned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    });
    jest.spyOn(service as unknown as { getCurrentMonthSessions: jest.Mock }, 'getCurrentMonthSessions').mockResolvedValue(0);
    jest.spyOn(service as unknown as { getPreviousMonthSessions: jest.Mock }, 'getPreviousMonthSessions').mockResolvedValue(0);
    jest.spyOn(service as unknown as { calculateReportsStats: jest.Mock }, 'calculateReportsStats').mockResolvedValue({});
    jest.spyOn(service as unknown as { calculateStudentsStats: jest.Mock }, 'calculateStudentsStats').mockResolvedValue({});
    jest.spyOn(service as unknown as { calculateTutorsStats: jest.Mock }, 'calculateTutorsStats').mockResolvedValue({});
    jest.spyOn(service as unknown as { calculateEstablishmentsStats: jest.Mock }, 'calculateEstablishmentsStats').mockResolvedValue({});
    jest.spyOn(service as unknown as { calculateVscReportsStats: jest.Mock }, 'calculateVscReportsStats').mockResolvedValue({});
    jest.spyOn(service as unknown as { calculateNewKpis: jest.Mock }, 'calculateNewKpis').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stat-sessions-hours: only CLOSED/COMPLETED (effective) count; 55 min → 0h55m not 6h', async () => {
    const pastDate = new Date('2020-01-01');
    sessionFind.mockResolvedValue([
      {
        status: SessionStatus.CLOSED,
        sessionDate: pastDate,
        startTime: '10:00:00',
        endTime: '10:55:00',
      },
      ...Array.from({ length: 5 }, (_, i) => ({
        status: SessionStatus.PLANNED,
        sessionDate: new Date(`2030-0${i + 1}-01`),
        startTime: '10:00:00',
        endTime: '11:00:00',
      })),
    ]);

    const res = await service.getDashboardStats('354eb5d0-17a4-4906-8b27-7c6339bdcd70', {});

    const hoursStat = res.stats['stat-sessions-hours'] as DashboardStatDto;
    expect(hoursStat.value).toBe('0h55m');
  });
});
