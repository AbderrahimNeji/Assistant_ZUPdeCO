import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BinomeCoeur } from './entities/binome-coeur.entity';
import { Session } from './entities/session.entity';
import { SessionStudentTutorPair } from './entities/session-student-tutor-pair.entity';
import { CreateBinomeCoeurDto } from './dto/create-binome-coeur.dto';

@Injectable()
export class BinomeCoeurService {
  constructor(
    @InjectRepository(BinomeCoeur)
    private readonly binomeCoeurRepository: Repository<BinomeCoeur>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async create(companyId: string, dto: CreateBinomeCoeurDto): Promise<BinomeCoeur> {
    const existing = await this.binomeCoeurRepository.findOne({
      where: {
        companyId,
        establishmentId: dto.establishmentId != null ? dto.establishmentId : IsNull(),
        subjectId: dto.subjectId != null ? dto.subjectId : IsNull(),
        studentUserId: dto.studentUserId,
        tutorUserId: dto.tutorUserId,
      },
    });
    if (existing) {
      throw new ConflictException('This binôme cœur already exists');
    }
    const row = this.binomeCoeurRepository.create({
      companyId,
      establishmentId: dto.establishmentId ?? null,
      subjectId: dto.subjectId ?? null,
      studentUserId: dto.studentUserId,
      tutorUserId: dto.tutorUserId,
      source: 'manual',
    });
    return this.binomeCoeurRepository.save(row);
  }

  async findAll(
    companyId: string,
    establishmentId?: string | null,
    subjectId?: string | null,
    classId?: string | null,
  ): Promise<BinomeCoeur[]> {
    if (classId) {
      const qb = this.binomeCoeurRepository
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.studentUser', 'studentUser')
        .leftJoinAndSelect('b.tutorUser', 'tutorUser')
        .leftJoinAndSelect('b.establishment', 'establishment')
        .leftJoinAndSelect('b.subject', 'subject')
        .innerJoin('user_profiles', 'up_sc', 'up_sc.user_id = b.student_user_id')
        .where('b.company_id = :companyId', { companyId })
        .andWhere('up_sc.school_class_id = :classId', { classId })
        .andWhere(
          establishmentId != null ? 'b.establishment_id = :establishmentId' : 'b.establishment_id IS NULL',
          establishmentId != null ? { establishmentId } : {},
        )
        .andWhere(
          subjectId != null ? 'b.subject_id = :subjectId' : 'b.subject_id IS NULL',
          subjectId != null ? { subjectId } : {},
        )
        .orderBy('b.created_at', 'DESC');
      return qb.getMany();
    }

    return this.binomeCoeurRepository.find({
      where: {
        companyId,
        establishmentId: establishmentId != null ? establishmentId : IsNull(),
        subjectId: subjectId != null ? subjectId : IsNull(),
      },
      relations: ['studentUser', 'tutorUser', 'establishment', 'subject'],
      order: { createdAt: 'DESC' },
    });
  }

  async remove(id: string, companyId: string): Promise<void> {
    const row = await this.binomeCoeurRepository.findOne({
      where: { id, companyId },
    });
    if (!row) throw new NotFoundException(`Binôme cœur ${id} not found`);
    await this.binomeCoeurRepository.delete(id);
  }

  /**
   * Count sessions where the student was actually assigned to the tutor (session_student_tutor_pairs),
   * same establishment and subject. Used for auto binôme cœur (≥5).
   */
  async countCommonSessions(
    studentUserId: string,
    tutorUserId: string,
    establishmentId: string,
    subjectId: string | null,
  ): Promise<number> {
    const qb = this.sessionRepository
      .createQueryBuilder('s')
      .innerJoin(
        SessionStudentTutorPair,
        'sstp',
        'sstp.session_id = s.id AND sstp.student_user_id = :studentUserId AND sstp.tutor_user_id = :tutorUserId',
        { studentUserId, tutorUserId },
      )
      .where('s.establishment_id = :establishmentId', { establishmentId })
      .andWhere('s.deleted_at IS NULL');
    if (subjectId != null) {
      qb.andWhere('s.subject_ids @> :subjectIdArr::jsonb', {
        subjectIdArr: JSON.stringify([subjectId]),
      });
    }
    return qb.getCount();
  }
}
