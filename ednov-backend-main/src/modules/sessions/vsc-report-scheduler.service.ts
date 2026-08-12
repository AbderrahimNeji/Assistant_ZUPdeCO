import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VscReportGenerationService } from './vsc-report-generation.service';
import { UsersVscConfigService } from '../users/users-vsc-config.service';
import { Company } from '../companies/entities/company.entity';

/**
 * Service pour planifier la génération automatique des rapports VSC.
 * Cron jobs (désactivés — remettre `disabled: false` pour réactiver) :
 * - Daily : tous les jours à 18h09 (Europe/Paris)
 * - Weekly : dimanche à 18h09 (Europe/Paris)
 */
@Injectable()
export class VscReportSchedulerService {
  private readonly logger = new Logger(VscReportSchedulerService.name);

  constructor(
    private readonly vscReportGenerationService: VscReportGenerationService,
    private readonly usersVscConfigService: UsersVscConfigService,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * Génère les rapports journaliers tous les jours à 17h25 (TEST).
   * Cron : 25 17 * * * (17h25 tous les jours)
   */
  @Cron('09 18 * * *', {
    name: 'generate-daily-vsc-reports',
    timeZone: 'Europe/Paris',
    disabled: true,
  })
  async handleDailyReports(): Promise<void> {
    console.log('========================================');
    console.log('🔵 CRON JOB TRIGGERED: Daily VSC reports generation');
    console.log('========================================');

    try {
      console.log('Step 1: Fetching active companies...');
      const companies = await this.companyRepository.find({
        where: { status: 'active' },
      });
      console.log(`✅ Found ${companies.length} active companies`);
      console.log(`Company IDs: ${companies.map(c => c.id).join(', ')}`);

      for (const company of companies) {
        console.log(`\n--- Processing company: ${company.id} ---`);
        
        console.log(`Step 2: Fetching VSCs with daily reports enabled for company ${company.id}...`);
        const vscs = await this.usersVscConfigService.getAllVscsWithDailyReports(
          company.id,
        );

        console.log(
          `✅ Found ${vscs.length} VSCs with daily reports enabled in company ${company.id}`,
        );
        
        if (vscs.length > 0) {
          console.log(`VSC IDs: ${vscs.map(v => v.id).join(', ')}`);
        }

        for (const vsc of vscs) {
          console.log(`\n  → Generating daily report for VSC ${vsc.id} (${vsc.displayName || vsc.email})`);
          try {
            await this.vscReportGenerationService.generateDailyReportForVsc(vsc);
            console.log(`  ✅ Daily report generated successfully for VSC ${vsc.id}`);
          } catch (error) {
            console.error(
              `  ❌ Failed to generate daily report for VSC ${vsc.id}`,
              error.stack || error,
            );
          }
        }
      }

      console.log('\n========================================');
      console.log('✅ Daily VSC reports generation completed');
      console.log('========================================');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in daily VSC reports generation', error.stack || error);
    }
  }

  /**
   * Génère les rapports hebdomadaires le dimanche à 17h25 (TEST).
   * Cron : 25 17 * * 0 (17h25 le dimanche)
   */
  @Cron('09 18 * * 0', {
    name: 'generate-weekly-vsc-reports',
    timeZone: 'Europe/Paris',
    disabled: true,
  })
  async handleWeeklyReports(): Promise<void> {
    console.log('========================================');
    console.log('🟣 CRON JOB TRIGGERED: Weekly VSC reports generation');
    console.log('========================================');

    try {
      console.log('Step 1: Fetching active companies...');
      const companies = await this.companyRepository.find({
        where: { status: 'active' },
      });
      console.log(`✅ Found ${companies.length} active companies`);
      console.log(`Company IDs: ${companies.map(c => c.id).join(', ')}`);

      for (const company of companies) {
        console.log(`\n--- Processing company: ${company.id} ---`);
        
        console.log(`Step 2: Fetching VSCs with weekly reports enabled for company ${company.id}...`);
        const vscs = await this.usersVscConfigService.getAllVscsWithWeeklyReports(
          company.id,
        );

        console.log(
          `✅ Found ${vscs.length} VSCs with weekly reports enabled in company ${company.id}`,
        );
        
        if (vscs.length > 0) {
          console.log(`VSC IDs: ${vscs.map(v => v.id).join(', ')}`);
        }

        for (const vsc of vscs) {
          console.log(`\n  → Generating weekly report for VSC ${vsc.id} (${vsc.displayName || vsc.email})`);
          try {
            await this.vscReportGenerationService.generateWeeklyReportForVsc(vsc);
            console.log(`  ✅ Weekly report generated successfully for VSC ${vsc.id}`);
          } catch (error) {
            console.error(
              `  ❌ Failed to generate weekly report for VSC ${vsc.id}`,
              error.stack || error,
            );
          }
        }
      }

      console.log('\n========================================');
      console.log('✅ Weekly VSC reports generation completed');
      console.log('========================================');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in weekly VSC reports generation', error.stack || error);
    }
  }
}
