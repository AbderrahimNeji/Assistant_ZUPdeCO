import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { GamificationNiveau } from './entities/gamification-niveau.entity';
import { GamificationBadge } from './entities/gamification-badge.entity';
import { GamificationBadgeCondition } from './entities/gamification-badge-condition.entity';
import { GamificationXpRegle } from './entities/gamification-xp-regle.entity';
import { TutorGamification } from './entities/tutor-gamification.entity';
import { GamificationXpLog } from './entities/gamification-xp-log.entity';
import { GamificationUserBadge } from './entities/gamification-user-badge.entity';
import { CreateGamificationNiveauDto } from './dto/create-gamification-niveau.dto';
import { UpdateGamificationNiveauDto } from './dto/update-gamification-niveau.dto';
import { CreateGamificationBadgeDto } from './dto/create-gamification-badge.dto';
import { UpdateGamificationBadgeDto } from './dto/update-gamification-badge.dto';
import { CreateGamificationXpRegleDto } from './dto/create-gamification-xp-regle.dto';
import { UpdateGamificationXpRegleDto } from './dto/update-gamification-xp-regle.dto';
import { resolveLevelBadge } from './level-badge.util';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(GamificationNiveau)
    private readonly niveauRepo: Repository<GamificationNiveau>,
    @InjectRepository(GamificationBadge)
    private readonly badgeRepo: Repository<GamificationBadge>,
    @InjectRepository(GamificationBadgeCondition)
    private readonly badgeConditionRepo: Repository<GamificationBadgeCondition>,
    @InjectRepository(GamificationXpRegle)
    private readonly xpRegleRepo: Repository<GamificationXpRegle>,
    @InjectRepository(TutorGamification)
    private readonly tutorGamificationRepo: Repository<TutorGamification>,
    @InjectRepository(GamificationXpLog)
    private readonly xpLogRepo: Repository<GamificationXpLog>,
    @InjectRepository(GamificationUserBadge)
    private readonly userBadgeRepo: Repository<GamificationUserBadge>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Awards `cr_soumis` XP once per session report to `userId`, using DB function
   * `gamification_add_xp`. Idempotent: skips if a `cr_soumis` log already exists
   * for this report or session (legacy trigger used session_id as source_id).
   */
  async tryAwardCrFirstSubmitXp(params: {
    companyId: string;
    sessionId: string;
    reportId: string;
    userId: string;
  }): Promise<void> {
    const { companyId, sessionId, reportId, userId } = params;
    try {
      await this.dataSource.transaction(async (manager) => {
        const existing: unknown[] = await manager.query(
          `SELECT 1 FROM gamification_xp_logs
           WHERE company_id = $1 AND action = $2
             AND (source_id = $3::uuid OR source_id = $4::uuid)
           LIMIT 1`,
          [companyId, 'cr_soumis', reportId, sessionId],
        );
        if (Array.isArray(existing) && existing.length > 0) {
          return;
        }
        await manager.query(`SELECT gamification_add_xp($1::uuid, $2::uuid, $3::varchar, $4::uuid)`, [
          userId,
          companyId,
          'cr_soumis',
          reportId,
        ]);
      });
    } catch (err) {
      this.logger.warn(
        `tryAwardCrFirstSubmitXp failed report=${reportId} user=${userId}: ${(err as Error).message}`,
      );
    }
  }

  /** Role codes that use tutor_gamification (same company). */
  private static readonly GAMIFICATION_USER_ROLE_CODES = new Set(['volunteer', 'tutor']);

  /**
   * Staff-only: same payload as getTutorGamification, after verifying target user
   * belongs to company and has tutor/volunteer role.
   */
  async getTutorGamificationForStaff(companyId: string, targetUserId: string) {
    const user = await this.userRepo.findOne({
      where: { id: targetUserId, companyId },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const eligible = user.userRoles?.some((ur) => {
      const code = ur.role?.code?.toLowerCase();
      return code != null && GamificationService.GAMIFICATION_USER_ROLE_CODES.has(code);
    });
    if (!eligible) {
      throw new ForbiddenException(
        'Gamification summary is only available for users with tutor or volunteer role',
      );
    }
    return this.getTutorGamification(targetUserId, companyId);
  }

  // ——— Niveaux ———
  async findNiveaux(companyId: string) {
    return this.niveauRepo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', numero: 'ASC' },
    });
  }

  async createNiveau(companyId: string, dto: CreateGamificationNiveauDto) {
    const niveau = this.niveauRepo.create({
      companyId,
      numero: dto.numero,
      nom: dto.nom,
      xpRequis: dto.xpRequis,
      icone: dto.icone ?? null,
      couleur: dto.couleur ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.niveauRepo.save(niveau);
  }

  async updateNiveau(companyId: string, id: string, dto: UpdateGamificationNiveauDto) {
    const niveau = await this.niveauRepo.findOne({ where: { id, companyId } });
    if (!niveau) throw new NotFoundException('Niveau not found');
    Object.assign(niveau, dto);
    return this.niveauRepo.save(niveau);
  }

  async deleteNiveau(companyId: string, id: string) {
    const result = await this.niveauRepo.delete({ id, companyId });
    if (result.affected === 0) throw new NotFoundException('Niveau not found');
  }

  // ——— Badges ———
  async findBadges(companyId: string) {
    return this.badgeRepo.find({
      where: { companyId },
      relations: ['conditions'],
      order: { createdAt: 'ASC' },
    });
  }

  async createBadge(companyId: string, dto: CreateGamificationBadgeDto) {
    const badge = this.badgeRepo.create({
      companyId,
      code: dto.code,
      nom: dto.nom,
      description: dto.description ?? null,
      categorie: dto.categorie ?? null,
      icone: dto.icone ?? null,
      couleur: dto.couleur ?? null,
      xpRecompense: dto.xpRecompense ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.badgeRepo.save(badge);
    if (dto.conditions?.length) {
      for (const c of dto.conditions) {
        const cond = this.badgeConditionRepo.create({
          badgeId: saved.id,
          typeCondition: c.typeCondition,
          operateur: c.operateur,
          valeur: c.valeur,
        });
        await this.badgeConditionRepo.save(cond);
      }
    }
    return this.badgeRepo.findOne({
      where: { id: saved.id },
      relations: ['conditions'],
    });
  }

  async updateBadge(companyId: string, id: string, dto: UpdateGamificationBadgeDto) {
    const badge = await this.badgeRepo.findOne({ where: { id, companyId } });
    if (!badge) throw new NotFoundException('Badge not found');
    const { conditions, ...rest } = dto;
    Object.assign(badge, rest);
    await this.badgeRepo.save(badge);
    if (conditions !== undefined) {
      await this.badgeConditionRepo.delete({ badgeId: id });
      for (const c of conditions) {
        const cond = this.badgeConditionRepo.create({
          badgeId: id,
          typeCondition: c.typeCondition,
          operateur: c.operateur,
          valeur: c.valeur,
        });
        await this.badgeConditionRepo.save(cond);
      }
    }
    return this.badgeRepo.findOne({
      where: { id },
      relations: ['conditions'],
    });
  }

  async deleteBadge(companyId: string, id: string) {
    const result = await this.badgeRepo.delete({ id, companyId });
    if (result.affected === 0) throw new NotFoundException('Badge not found');
  }

  // ——— XP Regles ———
  async findXpRegles(companyId: string) {
    return this.xpRegleRepo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', action: 'ASC' },
    });
  }

  async createXpRegle(companyId: string, dto: CreateGamificationXpRegleDto) {
    const regle = this.xpRegleRepo.create({
      companyId,
      action: dto.action,
      xpValue: dto.xpValue,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.xpRegleRepo.save(regle);
  }

  async updateXpRegle(companyId: string, id: string, dto: UpdateGamificationXpRegleDto) {
    const regle = await this.xpRegleRepo.findOne({ where: { id, companyId } });
    if (!regle) throw new NotFoundException('XP rule not found');
    Object.assign(regle, dto);
    return this.xpRegleRepo.save(regle);
  }

  async deleteXpRegle(companyId: string, id: string) {
    const result = await this.xpRegleRepo.delete({ id, companyId });
    if (result.affected === 0) throw new NotFoundException('XP rule not found');
  }

  // ——— Toggle ———
  async toggle(type: 'niveau' | 'badge' | 'xp_regle', id: string, companyId: string, isActive: boolean) {
    if (type === 'niveau') {
      const niveau = await this.niveauRepo.findOne({ where: { id, companyId } });
      if (!niveau) throw new NotFoundException('Niveau not found');
      niveau.isActive = isActive;
      return this.niveauRepo.save(niveau);
    }
    if (type === 'badge') {
      const badge = await this.badgeRepo.findOne({ where: { id, companyId } });
      if (!badge) throw new NotFoundException('Badge not found');
      badge.isActive = isActive;
      return this.badgeRepo.save(badge);
    }
    const regle = await this.xpRegleRepo.findOne({ where: { id, companyId } });
    if (!regle) throw new NotFoundException('XP rule not found');
    regle.isActive = isActive;
    return this.xpRegleRepo.save(regle);
  }

  // ——— Tutor (me) ———
  async getTutorGamification(userId: string, companyId: string) {
    let tg = await this.tutorGamificationRepo.findOne({
      where: { userId, companyId },
      relations: ['currentNiveau'],
    });
    if (!tg) {
      tg = this.tutorGamificationRepo.create({ userId, companyId, totalXp: 0 });
      tg = await this.tutorGamificationRepo.save(tg);
    }
    const badges = await this.userBadgeRepo.find({
      where: { userId },
      relations: ['badge'],
      order: { createdAt: 'DESC' },
    });
    const niveaux = await this.niveauRepo.find({
      where: { companyId, isActive: true },
      order: { sortOrder: 'ASC', numero: 'ASC' },
    });
    const currentNiveau = tg.currentNiveau;
    const currentIndex = currentNiveau
      ? niveaux.findIndex((n) => n.id === currentNiveau.id)
      : -1;
    const nextNiveau =
      currentIndex >= 0 && currentIndex < niveaux.length - 1
        ? niveaux[currentIndex + 1] ?? null
        : currentIndex < 0 && niveaux.length > 0
          ? niveaux[0]
          : null;
    const currentXpRequis = currentNiveau?.xpRequis ?? 0;
    const xpInCurrentLevel = Math.max(0, tg.totalXp - currentXpRequis);
    const xpToNextLevel =
      nextNiveau != null
        ? Math.max(0, nextNiveau.xpRequis - tg.totalXp)
        : null;
    const xpRangeToNext =
      nextNiveau != null ? nextNiveau.xpRequis - currentXpRequis : null;
    return {
      totalXp: tg.totalXp,
      currentNiveau: tg.currentNiveau,
      nextNiveau: nextNiveau ?? null,
      xpInCurrentLevel,
      xpToNextLevel,
      xpRangeToNext,
      levelBadge: resolveLevelBadge(tg.currentNiveau?.numero),
      attendanceScore: tg.attendanceScore != null ? Number(tg.attendanceScore) : null,
      pedagogicalQualityScore: tg.pedagogicalQualityScore != null ? Number(tg.pedagogicalQualityScore) : null,
      badges: badges.map((ub) => ({ badge: ub.badge, awardedAt: ub.createdAt })),
    };
  }

  async getTutorXpHistory(userId: string, companyId: string, limit = 50) {
    return this.xpLogRepo.find({
      where: { userId, companyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ——— Leaderboard ———
  async getLeaderboard(companyId: string, currentUserId: string, limit = 20) {
    const take = Math.min(Math.max(1, limit), 50);
    const top = await this.tutorGamificationRepo.find({
      where: { companyId },
      relations: ['user', 'currentNiveau'],
      order: { totalXp: 'DESC' },
      take,
    });
    const entries = top.map((tg, index) => ({
      rank: index + 1,
      userId: tg.userId,
      displayName:
        (tg.user?.displayName ??
          [tg.user?.firstName, tg.user?.lastName].filter(Boolean).join(' ')) ||
        'Tuteur',
      totalXp: tg.totalXp,
      currentNiveau: tg.currentNiveau
        ? {
            id: tg.currentNiveau.id,
            nom: tg.currentNiveau.nom,
            numero: tg.currentNiveau.numero,
            xpRequis: tg.currentNiveau.xpRequis,
            icone: tg.currentNiveau.icone ?? null,
            couleur: tg.currentNiveau.couleur ?? null,
          }
        : null,
      levelBadge: resolveLevelBadge(tg.currentNiveau?.numero),
    }));

    let myTg = await this.tutorGamificationRepo.findOne({
      where: { userId: currentUserId, companyId },
      relations: ['user', 'currentNiveau'],
    });
    if (!myTg) {
      myTg = this.tutorGamificationRepo.create({
        userId: currentUserId,
        companyId,
        totalXp: 0,
      });
      myTg = await this.tutorGamificationRepo.save(myTg);
      myTg = await this.tutorGamificationRepo.findOne({
        where: { userId: currentUserId, companyId },
        relations: ['user', 'currentNiveau'],
      }) ?? myTg;
    }

    const countAbove = await this.tutorGamificationRepo
      .createQueryBuilder('tg')
      .where('tg.company_id = :companyId', { companyId })
      .andWhere('tg.total_xp > :totalXp', { totalXp: myTg.totalXp })
      .getCount();
    const myRank = countAbove + 1;

    const myDisplayName =
      (myTg.user?.displayName ??
        [myTg.user?.firstName, myTg.user?.lastName].filter(Boolean).join(' ')) ||
      'Tuteur';
    const myEntry = {
      rank: myRank,
      userId: myTg.userId,
      displayName: myDisplayName,
      totalXp: myTg.totalXp,
      currentNiveau: myTg.currentNiveau
        ? {
            id: myTg.currentNiveau.id,
            nom: myTg.currentNiveau.nom,
            numero: myTg.currentNiveau.numero,
            xpRequis: myTg.currentNiveau.xpRequis,
            icone: myTg.currentNiveau.icone ?? null,
            couleur: myTg.currentNiveau.couleur ?? null,
          }
        : null,
      levelBadge: resolveLevelBadge(myTg.currentNiveau?.numero),
    };

    return { entries, myRank, myEntry };
  }
}
