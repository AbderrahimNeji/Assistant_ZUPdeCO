import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { GamificationService } from './gamification.service';
import { GamificationNiveau } from './entities/gamification-niveau.entity';
import { GamificationBadge } from './entities/gamification-badge.entity';
import { GamificationBadgeCondition } from './entities/gamification-badge-condition.entity';
import { GamificationXpRegle } from './entities/gamification-xp-regle.entity';
import { TutorGamification } from './entities/tutor-gamification.entity';
import { GamificationXpLog } from './entities/gamification-xp-log.entity';
import { GamificationUserBadge } from './entities/gamification-user-badge.entity';
import { User } from '../users/entities/user.entity';
import { CreateGamificationNiveauDto } from './dto/create-gamification-niveau.dto';
import { UpdateGamificationNiveauDto } from './dto/update-gamification-niveau.dto';
import { CreateGamificationBadgeDto } from './dto/create-gamification-badge.dto';
import { UpdateGamificationBadgeDto } from './dto/update-gamification-badge.dto';
import { CreateGamificationXpRegleDto } from './dto/create-gamification-xp-regle.dto';
import { UpdateGamificationXpRegleDto } from './dto/update-gamification-xp-regle.dto';

const companyId = 'company-uuid-1';
const userId = 'user-uuid-1';

describe('GamificationService', () => {
  let service: GamificationService;
  let dataSource: { transaction: jest.Mock };
  let niveauRepo: jest.Mocked<Repository<GamificationNiveau>>;
  let badgeRepo: jest.Mocked<Repository<GamificationBadge>>;
  let badgeConditionRepo: jest.Mocked<Repository<GamificationBadgeCondition>>;
  let xpRegleRepo: jest.Mocked<Repository<GamificationXpRegle>>;
  let tutorGamificationRepo: jest.Mocked<Repository<TutorGamification>>;
  let xpLogRepo: jest.Mocked<Repository<GamificationXpLog>>;
  let userBadgeRepo: jest.Mocked<Repository<GamificationUserBadge>>;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: getDataSourceToken(),
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GamificationNiveau),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GamificationBadge),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GamificationBadgeCondition),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GamificationXpRegle),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TutorGamification),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GamificationXpLog),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(GamificationUserBadge),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
    dataSource = module.get(getDataSourceToken());
    niveauRepo = module.get(getRepositoryToken(GamificationNiveau));
    badgeRepo = module.get(getRepositoryToken(GamificationBadge));
    badgeConditionRepo = module.get(getRepositoryToken(GamificationBadgeCondition));
    xpRegleRepo = module.get(getRepositoryToken(GamificationXpRegle));
    tutorGamificationRepo = module.get(getRepositoryToken(TutorGamification));
    xpLogRepo = module.get(getRepositoryToken(GamificationXpLog));
    userBadgeRepo = module.get(getRepositoryToken(GamificationUserBadge));
    userRepo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('tryAwardCrFirstSubmitXp', () => {
    it('runs gamification_add_xp when no prior cr_soumis log for report/session', async () => {
      const manager = {
        query: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      };
      dataSource.transaction.mockImplementationOnce(async (cb: (m: typeof manager) => Promise<void>) => {
        await cb(manager);
      });
      await service.tryAwardCrFirstSubmitXp({
        companyId,
        sessionId: 'sess-1',
        reportId: 'rep-1',
        userId,
      });
      expect(manager.query).toHaveBeenCalledTimes(2);
      expect(manager.query.mock.calls[1][0]).toContain('gamification_add_xp');
    });

    it('skips gamification_add_xp when a log already exists', async () => {
      const manager = {
        query: jest.fn().mockResolvedValueOnce([{ '?column?': 1 }]),
      };
      dataSource.transaction.mockImplementationOnce(async (cb: (m: typeof manager) => Promise<void>) => {
        await cb(manager);
      });
      await service.tryAwardCrFirstSubmitXp({
        companyId,
        sessionId: 'sess-1',
        reportId: 'rep-1',
        userId,
      });
      expect(manager.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('Niveaux', () => {
    describe('findNiveaux', () => {
      it('should return niveaux ordered by sortOrder and numero', async () => {
        const niveaux = [{ id: 'n1', companyId, numero: 1, nom: 'Débutant' }] as GamificationNiveau[];
        niveauRepo.find.mockResolvedValue(niveaux);

        const result = await service.findNiveaux(companyId);

        expect(result).toEqual(niveaux);
        expect(niveauRepo.find).toHaveBeenCalledWith({
          where: { companyId },
          order: { sortOrder: 'ASC', numero: 'ASC' },
        });
      });
    });

    describe('createNiveau', () => {
      it('should create and save a niveau with defaults', async () => {
        const dto: CreateGamificationNiveauDto = {
          numero: 1,
          nom: 'Bronze',
          xpRequis: 0,
        };
        const created = { id: 'n1', companyId, ...dto } as unknown as GamificationNiveau;
        niveauRepo.create.mockReturnValue(created);
        niveauRepo.save.mockResolvedValue(created);

        const result = await service.createNiveau(companyId, dto);

        expect(result).toEqual(created);
        expect(niveauRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            companyId,
            numero: 1,
            nom: 'Bronze',
            xpRequis: 0,
            icone: null,
            couleur: null,
            isActive: true,
            sortOrder: 0,
          }),
        );
      });
    });

    describe('updateNiveau', () => {
      it('should update niveau when found', async () => {
        const existing = { id: 'n1', companyId, nom: 'Bronze' } as GamificationNiveau;
        const dto: UpdateGamificationNiveauDto = { nom: 'Argent' };
        niveauRepo.findOne.mockResolvedValue(existing);
        niveauRepo.save.mockImplementation((e) => Promise.resolve(e as GamificationNiveau));

        await service.updateNiveau(companyId, 'n1', dto);

        expect(niveauRepo.findOne).toHaveBeenCalledWith({ where: { id: 'n1', companyId } });
        expect(niveauRepo.save).toHaveBeenCalledWith(expect.objectContaining({ nom: 'Argent' }));
      });

      it('should throw NotFoundException when niveau not found', async () => {
        niveauRepo.findOne.mockResolvedValue(null);

        await expect(service.updateNiveau(companyId, 'missing', { nom: 'X' })).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.updateNiveau(companyId, 'missing', { nom: 'X' })).rejects.toThrow(
          'Niveau not found',
        );
      });
    });

    describe('deleteNiveau', () => {
      it('should delete when niveau exists', async () => {
        niveauRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

        await service.deleteNiveau(companyId, 'n1');

        expect(niveauRepo.delete).toHaveBeenCalledWith({ id: 'n1', companyId });
      });

      it('should throw NotFoundException when no row affected', async () => {
        niveauRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

        await expect(service.deleteNiveau(companyId, 'missing')).rejects.toThrow(NotFoundException);
        await expect(service.deleteNiveau(companyId, 'missing')).rejects.toThrow('Niveau not found');
      });
    });
  });

  describe('Badges', () => {
    describe('findBadges', () => {
      it('should return badges with conditions', async () => {
        const badges = [{ id: 'b1', companyId, code: 'first_session' }] as GamificationBadge[];
        badgeRepo.find.mockResolvedValue(badges);

        const result = await service.findBadges(companyId);

        expect(result).toEqual(badges);
        expect(badgeRepo.find).toHaveBeenCalledWith({
          where: { companyId },
          relations: ['conditions'],
          order: { createdAt: 'ASC' },
        });
      });
    });

    describe('createBadge', () => {
      it('should create badge without conditions', async () => {
        const dto: CreateGamificationBadgeDto = { code: 'first', nom: 'Premier pas' };
        const saved = { id: 'b1', companyId, ...dto } as unknown as GamificationBadge;
        badgeRepo.create.mockReturnValue(saved);
        badgeRepo.save.mockResolvedValue(saved);
        badgeRepo.findOne.mockResolvedValue(saved);

        const result = await service.createBadge(companyId, dto);

        expect(result).toEqual(saved);
        expect(badgeConditionRepo.save).not.toHaveBeenCalled();
      });

      it('should create badge and conditions when provided', async () => {
        const dto: CreateGamificationBadgeDto = {
          code: 'ten_sessions',
          nom: '10 séances',
          conditions: [{ typeCondition: 'seances_count', operateur: '>=', valeur: 10 }],
        };
        const saved = { id: 'b1', companyId, code: dto.code, nom: dto.nom } as unknown as GamificationBadge;
        badgeRepo.create.mockReturnValue(saved);
        badgeRepo.save.mockResolvedValue(saved);
        const withConditions = { ...saved, conditions: [] };
        badgeRepo.findOne.mockResolvedValue(withConditions);
        badgeConditionRepo.create.mockReturnValue({} as GamificationBadgeCondition);
        badgeConditionRepo.save.mockResolvedValue({} as GamificationBadgeCondition);

        await service.createBadge(companyId, dto);

        expect(badgeConditionRepo.create).toHaveBeenCalledWith({
          badgeId: 'b1',
          typeCondition: 'seances_count',
          operateur: '>=',
          valeur: 10,
        });
        expect(badgeConditionRepo.save).toHaveBeenCalledTimes(1);
      });
    });

    describe('updateBadge', () => {
      it('should throw NotFoundException when badge not found', async () => {
        badgeRepo.findOne.mockResolvedValue(null);

        await expect(service.updateBadge(companyId, 'missing', { nom: 'X' })).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.updateBadge(companyId, 'missing', { nom: 'X' })).rejects.toThrow(
          'Badge not found',
        );
      });

      it('should replace conditions when conditions array provided', async () => {
        const existing = { id: 'b1', companyId, nom: 'Old' } as GamificationBadge;
        badgeRepo.findOne.mockResolvedValue(existing);
        badgeRepo.save.mockImplementation((e) => Promise.resolve(e as GamificationBadge));
        badgeConditionRepo.delete.mockResolvedValue({ affected: 1, raw: [] });
        badgeConditionRepo.create.mockReturnValue({} as GamificationBadgeCondition);
        badgeConditionRepo.save.mockResolvedValue({} as GamificationBadgeCondition);
        const updatedWithRelations = { ...existing, conditions: [{ typeCondition: 'sessions', operateur: '>=', valeur: 5 }] } as unknown as GamificationBadge;
        badgeRepo.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(updatedWithRelations);

        const dto: UpdateGamificationBadgeDto = {
          conditions: [{ typeCondition: 'sessions', operateur: '>=', valeur: 5 }],
        };
        const result = await service.updateBadge(companyId, 'b1', dto);

        expect(badgeConditionRepo.delete).toHaveBeenCalledWith({ badgeId: 'b1' });
        expect(badgeConditionRepo.create).toHaveBeenCalledWith({
          badgeId: 'b1',
          typeCondition: 'sessions',
          operateur: '>=',
          valeur: 5,
        });
      });
    });

    describe('deleteBadge', () => {
      it('should throw NotFoundException when no row affected', async () => {
        badgeRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

        await expect(service.deleteBadge(companyId, 'missing')).rejects.toThrow(NotFoundException);
        await expect(service.deleteBadge(companyId, 'missing')).rejects.toThrow('Badge not found');
      });
    });
  });

  describe('XP Regles', () => {
    describe('findXpRegles', () => {
      it('should return regles ordered by sortOrder and action', async () => {
        const regles = [{ id: 'r1', companyId, action: 'seance_terminee' }] as GamificationXpRegle[];
        xpRegleRepo.find.mockResolvedValue(regles);

        const result = await service.findXpRegles(companyId);

        expect(result).toEqual(regles);
        expect(xpRegleRepo.find).toHaveBeenCalledWith({
          where: { companyId },
          order: { sortOrder: 'ASC', action: 'ASC' },
        });
      });
    });

    describe('createXpRegle', () => {
      it('should create and save xp regle', async () => {
        const dto: CreateGamificationXpRegleDto = { action: 'seance_terminee', xpValue: 10 };
        const created = { id: 'r1', companyId, ...dto } as unknown as GamificationXpRegle;
        xpRegleRepo.create.mockReturnValue(created);
        xpRegleRepo.save.mockResolvedValue(created);

        const result = await service.createXpRegle(companyId, dto);

        expect(result).toEqual(created);
        expect(xpRegleRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            companyId,
            action: 'seance_terminee',
            xpValue: 10,
            description: null,
            isActive: true,
            sortOrder: 0,
          }),
        );
      });
    });

    describe('updateXpRegle', () => {
      it('should throw NotFoundException when regle not found', async () => {
        xpRegleRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateXpRegle(companyId, 'missing', { xpValue: 5 }),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.updateXpRegle(companyId, 'missing', { xpValue: 5 }),
        ).rejects.toThrow('XP rule not found');
      });
    });

    describe('deleteXpRegle', () => {
      it('should throw NotFoundException when no row affected', async () => {
        xpRegleRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

        await expect(service.deleteXpRegle(companyId, 'missing')).rejects.toThrow(NotFoundException);
        await expect(service.deleteXpRegle(companyId, 'missing')).rejects.toThrow('XP rule not found');
      });
    });
  });

  describe('toggle', () => {
    it('should toggle niveau isActive', async () => {
      const niveau = { id: 'n1', companyId, isActive: true } as GamificationNiveau;
      niveauRepo.findOne.mockResolvedValue(niveau);
      niveauRepo.save.mockImplementation((e) => Promise.resolve(e as GamificationNiveau));

      await service.toggle('niveau', 'n1', companyId, false);

      expect(niveauRepo.findOne).toHaveBeenCalledWith({ where: { id: 'n1', companyId } });
      expect(niveauRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('should throw NotFoundException when niveau not found for toggle', async () => {
      niveauRepo.findOne.mockResolvedValue(null);

      await expect(service.toggle('niveau', 'missing', companyId, true)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.toggle('niveau', 'missing', companyId, true)).rejects.toThrow(
        'Niveau not found',
      );
    });

    it('should toggle badge isActive', async () => {
      const badge = { id: 'b1', companyId, isActive: false } as GamificationBadge;
      badgeRepo.findOne.mockResolvedValue(badge);
      badgeRepo.save.mockImplementation((e) => Promise.resolve(e as GamificationBadge));

      await service.toggle('badge', 'b1', companyId, true);

      expect(badgeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
    });

    it('should throw NotFoundException when badge not found for toggle', async () => {
      badgeRepo.findOne.mockResolvedValue(null);

      await expect(service.toggle('badge', 'missing', companyId, false)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.toggle('badge', 'missing', companyId, false)).rejects.toThrow(
        'Badge not found',
      );
    });

    it('should toggle xp_regle isActive', async () => {
      const regle = { id: 'r1', companyId, isActive: true } as GamificationXpRegle;
      xpRegleRepo.findOne.mockResolvedValue(regle);
      xpRegleRepo.save.mockImplementation((e) => Promise.resolve(e as GamificationXpRegle));

      await service.toggle('xp_regle', 'r1', companyId, false);

      expect(xpRegleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('should throw NotFoundException when xp_regle not found for toggle', async () => {
      xpRegleRepo.findOne.mockResolvedValue(null);

      await expect(service.toggle('xp_regle', 'missing', companyId, true)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.toggle('xp_regle', 'missing', companyId, true)).rejects.toThrow(
        'XP rule not found',
      );
    });
  });

  describe('getTutorGamification', () => {
    it('should return existing tutor gamification with niveau and badges', async () => {
      const tg = {
        id: 'tg1',
        userId,
        companyId,
        totalXp: 100,
        currentNiveauId: 'n1',
        currentNiveau: { id: 'n1', nom: 'Bronze', numero: 1, xpRequis: 0 },
        attendanceScore: '85.50',
        pedagogicalQualityScore: '90.00',
      } as unknown as TutorGamification;
      tutorGamificationRepo.findOne.mockResolvedValue(tg);
      niveauRepo.find.mockResolvedValue([
        { id: 'n1', nom: 'Bronze', numero: 1, xpRequis: 0 },
      ] as unknown as GamificationNiveau[]);
      userBadgeRepo.find.mockResolvedValue([
        { badge: { id: 'b1', nom: 'First' }, createdAt: new Date('2024-01-01') },
      ] as unknown as GamificationUserBadge[]);

      const result = await service.getTutorGamification(userId, companyId);

      expect(result).toMatchObject({
        totalXp: 100,
        currentNiveau: { id: 'n1', nom: 'Bronze' },
        attendanceScore: 85.5,
        pedagogicalQualityScore: 90,
        levelBadge: {
          tier: 'bronze',
          displayLabel: 'Bronze',
          niveauNumero: 1,
        },
      });
      expect(result.badges).toHaveLength(1);
      expect(tutorGamificationRepo.create).not.toHaveBeenCalled();
    });

    it('should create tutor_gamification when not found and return summary', async () => {
      tutorGamificationRepo.findOne.mockResolvedValue(null);
      niveauRepo.find.mockResolvedValue([]);
      const created = {
        id: 'tg-new',
        userId,
        companyId,
        totalXp: 0,
        currentNiveauId: null,
        currentNiveau: null,
        attendanceScore: null,
        pedagogicalQualityScore: null,
      } as unknown as TutorGamification;
      tutorGamificationRepo.create.mockReturnValue(created);
      tutorGamificationRepo.save.mockResolvedValue(created);
      userBadgeRepo.find.mockResolvedValue([]);

      const result = await service.getTutorGamification(userId, companyId);

      expect(result).toMatchObject({
        totalXp: 0,
        currentNiveau: null,
        levelBadge: null,
        attendanceScore: null,
        pedagogicalQualityScore: null,
        badges: [],
      });
      expect(tutorGamificationRepo.create).toHaveBeenCalledWith({
        userId,
        companyId,
        totalXp: 0,
      });
      expect(tutorGamificationRepo.save).toHaveBeenCalled();
    });
  });

  describe('getTutorXpHistory', () => {
    it('should return xp logs ordered by createdAt DESC with limit', async () => {
      const logs = [
        { id: 'log1', userId, companyId, action: 'seance_terminee', amount: 10, createdAt: new Date() },
      ] as unknown as GamificationXpLog[];
      xpLogRepo.find.mockResolvedValue(logs);

      const result = await service.getTutorXpHistory(userId, companyId, 20);

      expect(result).toEqual(logs);
      expect(xpLogRepo.find).toHaveBeenCalledWith({
        where: { userId, companyId },
        order: { createdAt: 'DESC' },
        take: 20,
      });
    });

    it('should use default limit 50 when not provided', async () => {
      xpLogRepo.find.mockResolvedValue([]);

      await service.getTutorXpHistory(userId, companyId);

      expect(xpLogRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('getLeaderboard', () => {
    const user2Id = 'user-uuid-2';
    const niveau1 = { id: 'n1', nom: 'Débutant', numero: 1, xpRequis: 0, icone: null, couleur: null };

    it('should return top N entries ordered by totalXp DESC and myRank for current user', async () => {
      const topTutors = [
        {
          userId: user2Id,
          companyId,
          totalXp: 200,
          currentNiveau: niveau1,
          user: { displayName: 'Marie', firstName: null, lastName: null },
        },
        {
          userId,
          companyId,
          totalXp: 100,
          currentNiveau: niveau1,
          user: { displayName: null, firstName: 'Jean', lastName: 'Dupont' },
        },
      ] as unknown as TutorGamification[];
      tutorGamificationRepo.find.mockResolvedValue(topTutors);

      const myTg = {
        userId,
        companyId,
        totalXp: 100,
        currentNiveau: niveau1,
        user: { displayName: null, firstName: 'Jean', lastName: 'Dupont' },
      } as unknown as TutorGamification;
      tutorGamificationRepo.findOne.mockResolvedValue(myTg);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      tutorGamificationRepo.createQueryBuilder.mockReturnValue(mockQb as never);

      const result = await service.getLeaderboard(companyId, userId, 20);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toMatchObject({
        rank: 1,
        displayName: 'Marie',
        totalXp: 200,
        levelBadge: { tier: 'bronze', niveauNumero: 1 },
      });
      expect(result.entries[1]).toMatchObject({
        rank: 2,
        displayName: 'Jean Dupont',
        totalXp: 100,
        levelBadge: { tier: 'bronze', niveauNumero: 1 },
      });
      expect(result.myRank).toBe(2);
      expect(result.myEntry).toMatchObject({
        rank: 2,
        totalXp: 100,
        levelBadge: { tier: 'bronze', niveauNumero: 1 },
      });
      expect(tutorGamificationRepo.find).toHaveBeenCalledWith({
        where: { companyId },
        relations: ['user', 'currentNiveau'],
        order: { totalXp: 'DESC' },
        take: 20,
      });
    });

    it('should cap limit at 50', async () => {
      tutorGamificationRepo.find.mockResolvedValue([]);
      const myTg = { userId, companyId, totalXp: 0, currentNiveau: null, user: null } as unknown as TutorGamification;
      tutorGamificationRepo.findOne.mockResolvedValue(myTg);
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      tutorGamificationRepo.createQueryBuilder.mockReturnValue(mockQb as never);

      await service.getLeaderboard(companyId, userId, 100);

      expect(tutorGamificationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('getTutorGamificationForStaff', () => {
    const targetId = 'target-user-uuid';

    it('throws NotFoundException when user missing', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getTutorGamificationForStaff(companyId, targetId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user has no tutor/volunteer role', async () => {
      userRepo.findOne.mockResolvedValue({
        id: targetId,
        companyId,
        userRoles: [{ role: { code: 'STUDENT' } }],
      } as unknown as User);

      await expect(service.getTutorGamificationForStaff(companyId, targetId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns gamification summary for volunteer user', async () => {
      userRepo.findOne.mockResolvedValue({
        id: targetId,
        companyId,
        userRoles: [{ role: { code: 'volunteer' } }],
      } as unknown as User);
      const createdTg = {
        userId: targetId,
        companyId,
        totalXp: 0,
        currentNiveau: null,
        attendanceScore: null,
        pedagogicalQualityScore: null,
      } as unknown as TutorGamification;
      tutorGamificationRepo.findOne.mockResolvedValue(null);
      tutorGamificationRepo.create.mockReturnValue(createdTg);
      tutorGamificationRepo.save.mockResolvedValue(createdTg);
      niveauRepo.find.mockResolvedValue([]);
      userBadgeRepo.find.mockResolvedValue([]);

      const result = await service.getTutorGamificationForStaff(companyId, targetId);

      expect(result.totalXp).toBe(0);
      expect(result.levelBadge).toBeNull();
    });
  });
});
