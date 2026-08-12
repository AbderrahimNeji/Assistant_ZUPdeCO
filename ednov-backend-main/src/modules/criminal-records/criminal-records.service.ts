import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import { TutorCriminalRecord, TutorCriminalRecordStatus } from './entities/tutor-criminal-record.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserRole } from '../users/entities/user-role.entity';

const PDF_MIMES = new Set(['application/pdf', 'application/x-pdf']);
const MAX_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

export interface CriminalRecordSummaryDto {
  fileName: string;
  depositedAt: string;
  status: TutorCriminalRecordStatus;
  validatedAt: string | null;
}

function hasPdfMagic(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isTutorLikeRole(code: string): boolean {
  const u = code.toUpperCase();
  return u === 'TUTOR' || u === 'VOLUNTEER';
}

function isCoordinatorLikeRole(code: string): boolean {
  const u = code.toUpperCase();
  return u === 'COORDINATOR' || u === 'ADMIN' || u === 'MANAGER';
}

@Injectable()
export class CriminalRecordsService {
  constructor(
    @InjectRepository(TutorCriminalRecord)
    private readonly recordRepo: Repository<TutorCriminalRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepo: Repository<UserProfile>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly dataSource: DataSource,
  ) {}

  private getBucket() {
    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    return admin.storage().bucket(bucketName);
  }

  private storagePathFor(companyId: string, userId: string, objectId: string): string {
    return `companies/${companyId}/tutors/${userId}/criminal-record/${objectId}.pdf`;
  }

  assertTutorRoles(roleCodes: string[]): void {
    const ok = roleCodes?.some(isTutorLikeRole);
    if (!ok) {
      throw new ForbiddenException('This action is restricted to tutors');
    }
  }

  assertCoordinatorRoles(roleCodes: string[]): void {
    const ok = roleCodes?.some(isCoordinatorLikeRole);
    if (!ok) {
      throw new ForbiddenException('This action requires coordinator, admin, or manager role');
    }
  }

  private async assertUserInCompany(userId: string, companyId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId, companyId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async assertTargetIsTutorInCompany(tutorUserId: string, companyId: string): Promise<void> {
    await this.assertUserInCompany(tutorUserId, companyId);
    const urs = await this.userRoleRepo.find({
      where: { userId: tutorUserId },
      relations: ['role'],
    });
    const codes = urs
      .filter((ur) => ur.role?.companyId === companyId)
      .map((ur) => ur.role!.code);
    if (!codes.some(isTutorLikeRole)) {
      throw new BadRequestException('Target user is not a tutor');
    }
  }

  toSummary(row: TutorCriminalRecord | null): CriminalRecordSummaryDto | null {
    if (!row) return null;
    return {
      fileName: row.fileName,
      depositedAt: row.depositedAt.toISOString(),
      status: row.status,
      validatedAt: row.validatedAt ? row.validatedAt.toISOString() : null,
    };
  }

  async getForUser(userId: string, companyId: string): Promise<TutorCriminalRecord | null> {
    return this.recordRepo.findOne({ where: { userId, companyId } });
  }

  async getSummaryForUser(userId: string, companyId: string): Promise<CriminalRecordSummaryDto | null> {
    const row = await this.getForUser(userId, companyId);
    return this.toSummary(row);
  }

  async getTutorPlatformStatus(userId: string): Promise<'pending' | 'active'> {
    const profile = await this.userProfileRepo.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    const s = profile?.tutorPlatformStatus;
    return s === 'pending' ? 'pending' : 'active';
  }

  async getSignedDownloadUrl(storagePath: string): Promise<string> {
    const bucket = this.getBucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) throw new NotFoundException('File not found in storage');
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
      responseType: 'application/pdf',
    });
    return url;
  }

  async uploadForSelf(
    userId: string,
    companyId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ): Promise<{ criminalRecord: CriminalRecordSummaryDto; tutorPlatformStatus: 'pending' | 'active' }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File size must not exceed 10MB');
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (!PDF_MIMES.has(mime) && !mime.endsWith('/pdf')) {
      throw new BadRequestException('Invalid file type. Only PDF is allowed');
    }
    if (!hasPdfMagic(file.buffer)) {
      throw new BadRequestException('Invalid file type. Only PDF is allowed');
    }

    const objectId = randomUUID();
    const path = this.storagePathFor(companyId, userId, objectId);
    const bucket = this.getBucket();
    const storageFile = bucket.file(path);

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TutorCriminalRecord);
      const existing = await repo.findOne({ where: { userId, companyId } });
      if (existing) {
        if (existing.status === 'validated') {
          throw new BadRequestException('Cannot replace a validated criminal record');
        }
        const oldFile = bucket.file(existing.storagePath);
        try {
          await oldFile.delete({ ignoreNotFound: true });
        } catch {
          // best-effort cleanup
        }
        await repo.remove(existing);
      }

      await storageFile.save(file.buffer, {
        metadata: { contentType: 'application/pdf' },
      });

      const now = new Date();
      const row = repo.create({
        companyId,
        userId,
        storagePath: path,
        fileName: file.originalname?.replace(/[/\\]/g, '_') || 'document.pdf',
        mimeType: 'application/pdf',
        fileSize: String(file.size),
        status: 'pending' as TutorCriminalRecordStatus,
        depositedAt: now,
        validatedAt: null,
        validatedByUserId: null,
      });
      await repo.save(row);
    });

    const saved = await this.getForUser(userId, companyId);
    if (!saved) throw new BadRequestException('Failed to save criminal record');

    const profiles = await this.userProfileRepo.find({ where: { userId } });
    for (const p of profiles) {
      p.tutorPlatformStatus = 'pending';
      await this.userProfileRepo.save(p);
    }

    const tutorPlatformStatus = await this.getTutorPlatformStatus(userId);
    return {
      criminalRecord: this.toSummary(saved)!,
      tutorPlatformStatus,
    };
  }

  async getDownloadUrlForSelf(userId: string, companyId: string): Promise<{ url: string }> {
    const row = await this.getForUser(userId, companyId);
    if (!row) throw new NotFoundException('No criminal record on file');
    const url = await this.getSignedDownloadUrl(row.storagePath);
    return { url };
  }

  async getForTutorAsStaff(
    tutorUserId: string,
    companyId: string,
  ): Promise<CriminalRecordSummaryDto | null> {
    await this.assertTargetIsTutorInCompany(tutorUserId, companyId);
    return this.getSummaryForUser(tutorUserId, companyId);
  }

  async getDownloadUrlForTutorAsStaff(
    tutorUserId: string,
    companyId: string,
  ): Promise<{ url: string }> {
    await this.assertTargetIsTutorInCompany(tutorUserId, companyId);
    const row = await this.getForUser(tutorUserId, companyId);
    if (!row) throw new NotFoundException('No criminal record on file');
    const url = await this.getSignedDownloadUrl(row.storagePath);
    return { url };
  }

  async validateAsCoordinator(
    tutorUserId: string,
    companyId: string,
    actorUserId: string,
  ): Promise<{ criminalRecord: CriminalRecordSummaryDto; tutorPlatformStatus: 'active' }> {
    await this.assertTargetIsTutorInCompany(tutorUserId, companyId);

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TutorCriminalRecord);
      const profileRepo = manager.getRepository(UserProfile);
      const row = await repo.findOne({ where: { userId: tutorUserId, companyId } });
      if (!row) {
        throw new BadRequestException('No criminal record to validate');
      }
      if (row.status === 'validated') {
        throw new BadRequestException('Criminal record is already validated');
      }
      const now = new Date();
      row.status = 'validated';
      row.validatedAt = now;
      row.validatedByUserId = actorUserId;
      await repo.save(row);

      const profiles = await profileRepo.find({ where: { userId: tutorUserId } });
      for (const p of profiles) {
        p.tutorPlatformStatus = 'active';
        await profileRepo.save(p);
      }
    });

    const saved = await this.getForUser(tutorUserId, companyId);
    return {
      criminalRecord: this.toSummary(saved)!,
      tutorPlatformStatus: 'active',
    };
  }
}
