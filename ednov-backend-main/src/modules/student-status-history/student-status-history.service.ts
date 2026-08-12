import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentStatusHistory } from './entities/student-status-history.entity';
import { isStudentAccountStatus } from '../users/user-status';

export interface RecordStudentStatusHistoryPayload {
  studentUserId: string;
  updatedByUserId: string | null;
  /** `null` = première inscription (création compte élève), sans statut élève antérieur. */
  oldStatus: string | null;
  newStatus: string;
  /** Motif de désactivation — renseigné uniquement quand newStatus = 'deactivated'. */
  reason?: string | null;
  /** Précision libre lorsque reason = 'Autre'. */
  reasonNote?: string | null;
}

@Injectable()
export class StudentStatusHistoryService {
  private readonly logger = new Logger(StudentStatusHistoryService.name);

  constructor(
    @InjectRepository(StudentStatusHistory)
    private readonly repo: Repository<StudentStatusHistory>,
  ) {}

  async record(payload: RecordStudentStatusHistoryPayload): Promise<void> {
    const { oldStatus, newStatus } = payload;
    if (oldStatus === null) {
      if (!isStudentAccountStatus(newStatus)) {
        this.logger.warn(
          `Skip student_status_history: invalid new status on creation new=${newStatus}`,
        );
        return;
      }
    } else if (!isStudentAccountStatus(oldStatus) || !isStudentAccountStatus(newStatus)) {
      this.logger.warn(
        `Skip student_status_history: non-student statuses old=${oldStatus} new=${newStatus}`,
      );
      return;
    }
    try {
      const row = this.repo.create({
        studentUserId: payload.studentUserId,
        updatedById: payload.updatedByUserId,
        oldStatus: payload.oldStatus,
        newStatus: payload.newStatus,
        reason: payload.newStatus === 'deactivated' ? (payload.reason ?? null) : null,
        reasonNote:
          payload.newStatus === 'deactivated' && payload.reason === 'Autre'
            ? (payload.reasonNote ?? null)
            : null,
      });
      await this.repo.save(row);
    } catch (error) {
      this.logger.error(
        'Failed to write student_status_history',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async findByStudentUserId(studentUserId: string): Promise<StudentStatusHistory[]> {
    return this.repo.find({
      where: { studentUserId },
      order: { createdAt: 'DESC' },
      relations: ['updatedBy'],
    });
  }
}
