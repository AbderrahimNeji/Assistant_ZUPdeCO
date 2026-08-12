import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditLogService } from '../audit/audit.service';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(companyId: string, dto: CreateProfileDto, actorId?: string): Promise<Profile> {
    const existing = await this.profileRepository.findOne({
      where: { companyId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Profile code "${dto.code}" already exists`);

    const profile = this.profileRepository.create({ ...dto, companyId });
    const saved = await this.profileRepository.save(profile);

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'profiles',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async findAll(companyId: string): Promise<Profile[]> {
    return this.profileRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({ where: { id, companyId } });
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);
    return profile;
  }

  async update(id: string, companyId: string, dto: UpdateProfileDto, actorId?: string): Promise<Profile> {
    const profile = await this.findOne(id, companyId);
    const oldValue = { ...profile } as unknown as Record<string, unknown>;
    Object.assign(profile, dto);
    const saved = await this.profileRepository.save(profile);

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'profiles',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async remove(id: string, companyId: string, actorId?: string): Promise<void> {
    const profile = await this.findOne(id, companyId);

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'profiles',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: profile.id, code: profile.code } as Record<string, unknown>,
    });

    await this.profileRepository.softDelete(id);
  }
}
