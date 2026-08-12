import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { Session } from '../sessions/entities/session.entity';
import { UsersService } from './users.service';

@Injectable()
export class StudentStatusSchedulerService {
  private readonly logger = new Logger(StudentStatusSchedulerService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SessionParticipant)
    private readonly participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'student-status-transition',
    timeZone: 'Europe/Paris',
  })
  async handleStatusTransitions(): Promise<void> {
    const jobId = `transition-${Date.now()}`;
    this.logger.log(`[${jobId}] 🚀 Starting nightly student status transition job...`);

    try {
      const today = new Date().toISOString().split('T')[0];
      const threshold = this.usersService.getAccompaniedMinPresentSessions();

      if (!threshold || threshold < 1) {
        this.logger.error(`[${jobId}] ❌ Invalid threshold: ${threshold}`);
        return;
      }

      // 1. Find target students
      const targetStudents = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.userRoles', 'userRole')
        .innerJoin('userRole.role', 'role')
        .innerJoin(SessionParticipant, 'participant', 'participant.userId = user.id')
        .innerJoin(Session, 'session', 'session.id = participant.sessionId')
        .where('role.code = :roleCode', { roleCode: 'student' })
        .andWhere('user.status = :status', { status: 'registered' })
        .andWhere('session.sessionDate = :today', { today })
        .select(['user.id', 'user.companyId', 'user.status'])
        .getMany();

      if (targetStudents.length === 0) {
        this.logger.log(`[${jobId}] ℹ️ No registered students found in today's sessions.`);
        return;
      }

      // 2. Batch count sessions (N+1 fix) - only count sessions up to today that are present or pending
      const sessionCounts = await this.participantRepository
        .createQueryBuilder('participant')
        .innerJoin(Session, 'session', 'session.id = participant.sessionId')
        .select('participant.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('participant.userId IN (:...ids)', { ids: targetStudents.map(s => s.id) })
        .andWhere('participant.attendanceStatus IN (:...statuses)', { statuses: ['present', 'pending'] })
        .andWhere('session.sessionDate <= :today', { today })
        .groupBy('participant.userId')
        .getRawMany();

      const countMap = new Map(sessionCounts.map(r => [r.userId, parseInt(r.count, 10)]));

      this.logger.log(`[${jobId}] 🔍 Checking ${targetStudents.length} students (threshold: ${threshold}).`);

      let changedCount = 0;

      // 3. Process within transaction
      await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);

        for (const student of targetStudents) {
          const sessionCount = countMap.get(student.id) || 0;
          const previousStatus = student.status;
          let newStatus = student.status;

          if (previousStatus === 'registered' && sessionCount >= threshold) {
            newStatus = 'accompanied';
          } else if (previousStatus === 'accompanied' && sessionCount < threshold) {
            newStatus = 'registered';
          }

          if (newStatus !== previousStatus) {
            // Optimistic check: only update if status is still what we expect
            const updateResult = await userRepo.update(
              { id: student.id, status: previousStatus as any },
              { status: newStatus as any },
            );

            if (updateResult.affected === 0) {
              this.logger.warn(`[${jobId}] ⚠️ Student ${student.id} status changed concurrently, skipped.`);
              continue;
            }

            // Record history
            await this.usersService.recordStudentAccountStatusChange(
              student.companyId,
              student.id,
              null,
              previousStatus as any,
              newStatus as any,
              'auto_present_sessions',
            );

            changedCount++;
            this.logger.debug(`[${jobId}] ✅ Student ${student.id} transitioned ${previousStatus} -> ${newStatus} (${sessionCount} sessions).`);
          }
        }
      });

      this.logger.log(`[${jobId}] 🏁 Job finished. Updated ${changedCount} students.`);
    } catch (error) {
      this.logger.error(`[${jobId}] ❌ Job failed: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}
