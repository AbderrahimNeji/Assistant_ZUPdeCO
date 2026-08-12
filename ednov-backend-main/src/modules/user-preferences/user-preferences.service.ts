import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInterfacePreference } from './entities/user-interface-preference.entity';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UpdateInterfaceConfigDto } from './dto/update-interface-config.dto';
import { AuditLogService } from '../audit/audit.service';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserInterfacePreference)
    private readonly preferencesRepository: Repository<UserInterfacePreference>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getUserPreferences(userId: string, companyId: string): Promise<UserInterfacePreference> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId, companyId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        companyId,
        isDarkMode: false,
        interfaceConfigs: {},
      });
      preferences = await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  async updateUserPreferences(
    userId: string,
    companyId: string,
    dto: UpdateUserPreferencesDto,
  ): Promise<UserInterfacePreference> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId, companyId },
    });

    const oldValue = preferences ? ({ ...preferences } as unknown as Record<string, unknown>) : undefined;

    if (preferences) {
      Object.assign(preferences, dto);
      preferences = await this.preferencesRepository.save(preferences);
    } else {
      preferences = this.preferencesRepository.create({
        userId,
        companyId,
        ...dto,
      });
      preferences = await this.preferencesRepository.save(preferences);
    }

    await this.auditLogService.log({
      companyId,
      userId,
      entity: 'user_interface_preferences',
      entityId: preferences.id,
      action: oldValue ? 'UPDATE' : 'CREATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return preferences;
  }

  async updateInterfaceConfig(
    userId: string,
    companyId: string,
    interfaceName: string,
    dto: UpdateInterfaceConfigDto,
  ): Promise<UserInterfacePreference> {
    let preferences = await this.getUserPreferences(userId, companyId);

    const oldValue = { ...preferences } as unknown as Record<string, unknown>;

    const updatedConfigs = {
      ...preferences.interfaceConfigs,
      [interfaceName]: dto.config,
    };

    preferences.interfaceConfigs = updatedConfigs;
    preferences = await this.preferencesRepository.save(preferences);

    await this.auditLogService.log({
      companyId,
      userId,
      entity: 'user_interface_preferences',
      entityId: preferences.id,
      action: 'UPDATE',
      oldValue,
      newValue: { interfaceConfigs: updatedConfigs } as Record<string, unknown>,
    });

    return preferences;
  }
}
