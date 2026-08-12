import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { VSC_USER_ACCOUNT_STATUSES } from './user-status';

/**
 * Service pour gérer la configuration des rapports automatiques VSC.
 * Gère le champ vscReportsFrequencies dans user_profiles.
 */
@Injectable()
export class UsersVscConfigService {
  private readonly logger = new Logger(UsersVscConfigService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Met à jour les fréquences de rapports automatiques pour un VSC.
   */
  async updateVscReportsFrequencies(
    userId: string,
    frequencies: { daily: boolean; weekly: boolean },
  ): Promise<UserProfile> {
    const userProfile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile not found for user ${userId}`);
    }

    userProfile.vscReportsFrequencies = frequencies;
    return this.userProfileRepository.save(userProfile);
  }

  /**
   * Récupère les fréquences de rapports automatiques pour un VSC.
   */
  async getVscReportsFrequencies(
    userId: string,
  ): Promise<{ daily: boolean; weekly: boolean }> {
    const userProfile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile not found for user ${userId}`);
    }

    return (
      userProfile.vscReportsFrequencies || { daily: false, weekly: false }
    );
  }

  /**
   * Récupère tous les VSC ayant activé les rapports journaliers.
   */
  async getAllVscsWithDailyReports(companyId: string): Promise<User[]> {
    console.log(`  🔹 getAllVscsWithDailyReports START for company ${companyId}`);
    
    console.log(`  Building query with filters:`);
    console.log(`    - company_id = ${companyId}`);
    console.log(`    - role.code = 'volunteer'`);
    console.log(`    - vsc_reports_frequencies->>'daily' = 'true'`);
    console.log(`    - user.status = active`);

    const userProfiles = await this.userProfileRepository
      .createQueryBuilder('up')
      .innerJoinAndSelect('up.user', 'user')
      .innerJoinAndSelect('user.userRoles', 'userRoles')
      .innerJoinAndSelect('userRoles.role', 'role')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('role.code = :roleCode', { roleCode: 'volunteer' })
      .andWhere("(up.vsc_reports_frequencies->>'daily')::boolean = true")
      .andWhere('user.status IN (:...vscUserStatuses)', {
        vscUserStatuses: [...VSC_USER_ACCOUNT_STATUSES],
      })
      .getMany();

    console.log(`  ✅ Query returned ${userProfiles.length} user profiles`);
    
    if (userProfiles.length > 0) {
      userProfiles.forEach((up, idx) => {
        console.log(`    [${idx + 1}] User ${up.user.id} - ${up.user.displayName || up.user.email}`);
        console.log(`        vscReportsFrequencies: ${JSON.stringify(up.vscReportsFrequencies)}`);
      });
    }

    const users = userProfiles.map((up) => up.user);
    console.log(`  🔹 getAllVscsWithDailyReports END - returning ${users.length} users`);
    return users;
  }

  /**
   * Récupère tous les VSC ayant activé les rapports hebdomadaires.
   */
  async getAllVscsWithWeeklyReports(companyId: string): Promise<User[]> {
    console.log(`  🔹 getAllVscsWithWeeklyReports START for company ${companyId}`);
    
    console.log(`  Building query with filters:`);
    console.log(`    - company_id = ${companyId}`);
    console.log(`    - role.code = 'volunteer'`);
    console.log(`    - vsc_reports_frequencies->>'weekly' = 'true'`);
    console.log(`    - user.status = active`);

    const userProfiles = await this.userProfileRepository
      .createQueryBuilder('up')
      .innerJoinAndSelect('up.user', 'user')
      .innerJoinAndSelect('user.userRoles', 'userRoles')
      .innerJoinAndSelect('userRoles.role', 'role')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('role.code = :roleCode', { roleCode: 'volunteer' })
      .andWhere("(up.vsc_reports_frequencies->>'weekly')::boolean = true")
      .andWhere('user.status IN (:...vscUserStatuses)', {
        vscUserStatuses: [...VSC_USER_ACCOUNT_STATUSES],
      })
      .getMany();

    console.log(`  ✅ Query returned ${userProfiles.length} user profiles`);
    
    if (userProfiles.length > 0) {
      userProfiles.forEach((up, idx) => {
        console.log(`    [${idx + 1}] User ${up.user.id} - ${up.user.displayName || up.user.email}`);
        console.log(`        vscReportsFrequencies: ${JSON.stringify(up.vscReportsFrequencies)}`);
      });
    }

    const users = userProfiles.map((up) => up.user);
    console.log(`  🔹 getAllVscsWithWeeklyReports END - returning ${users.length} users`);
    return users;
  }

  /**
   * Récupère tous les VSC ayant activé au moins une fréquence de rapport.
   */
  async getAllVscsWithAnyReportFrequency(companyId: string): Promise<User[]> {
    const userProfiles = await this.userProfileRepository
      .createQueryBuilder('up')
      .innerJoinAndSelect('up.user', 'user')
      .innerJoinAndSelect('user.userRoles', 'userRoles')
      .innerJoinAndSelect('userRoles.role', 'role')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('role.code = :roleCode', { roleCode: 'volunteer' })
      .andWhere(
        "(up.vsc_reports_frequencies->>'daily' = 'true' OR up.vsc_reports_frequencies->>'weekly' = 'true')",
      )
      .andWhere('user.status IN (:...vscUserStatuses)', {
        vscUserStatuses: [...VSC_USER_ACCOUNT_STATUSES],
      })
      .getMany();

    return userProfiles.map((up) => up.user);
  }
}
