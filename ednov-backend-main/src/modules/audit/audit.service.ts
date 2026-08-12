import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogPayload {
  companyId: string;
  userId?: string;
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(payload: AuditLogPayload): Promise<void> {
    try {
      const entry = this.auditLogRepository.create({
        companyId: payload.companyId,
        userId: payload.userId ?? null,
        entity: payload.entity,
        entityId: payload.entityId,
        action: payload.action,
        oldValue: payload.oldValue ?? null,
        newValue: payload.newValue ?? null,
      });
      await this.auditLogRepository.save(entry);
    } catch (error) {
      // Audit failure must never break the main transaction.
      console.error('Failed to write audit log', (error as Error).stack);
    }
  }
}
