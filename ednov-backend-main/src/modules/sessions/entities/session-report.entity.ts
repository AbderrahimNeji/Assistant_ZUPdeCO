import { Entity, Column, Index, ManyToOne, JoinColumn, Unique, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Session } from './session.entity';
import { User } from '../../users/entities/user.entity';
import type { SessionReportAuthorFeedback } from '../session-report-author-feedback';

export type SessionReportStatus = 'to_complete' | 'draft' | 'submitted' | 'validated' | 'overdue';

@Entity({ name: 'session_reports' })
@Unique(['companyId', 'sessionId'])
@Index(['companyId'])
export class SessionReport extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => Session, (s) => s.sessionReports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Relation<Session>;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>;

  /** Per-author evaluation (tutor/volunteer); length depends on session type. */
  @Column({ type: 'jsonb', name: 'author_feedbacks', default: [] })
  authorFeedbacks: SessionReportAuthorFeedback[];

  @Column({ type: 'text', name: 'script', nullable: true })
  script: string | null;

  /**
   * Conservé pour l’instant : texte libre, ancien encodage client, compatibilité exports / requêtes.
   * Le modèle cible les matières structurées via `subject_ids` (jsonb) quand la migration sera faite.
   * Ne pas supprimer tant que les consommateurs n’ont pas basculé.
   */
  @Column({ type: 'varchar', length: 255, name: 'subject', nullable: true })
  subject: string | null;

  /** Identifiants des matières (référentiel `subjects`). */
  @Column({ type: 'jsonb', name: 'subject_ids', default: [] })
  subjectIds: string[];

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'to_complete' })
  status: SessionReportStatus;

  @Column({ type: 'uuid', name: 'validated_by', nullable: true })
  validatedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'validated_by' })
  validatedBy: Relation<User> | null;

  @Column({ type: 'timestamptz', name: 'validated_at', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'int', name: 'version', default: 1 })
  version: number;

  @Column({ type: 'jsonb', name: 'generated_resources', nullable: true })
  generatedResources: { title: string; problem: string; solution: string }[] | null;

  @Column({ type: 'varchar', length: 255, name: 'author_name', nullable: true })
  authorName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'session_display_name', nullable: true })
  sessionDisplayName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'validated_by_name', nullable: true })
  validatedByName: string | null;

  /**
   * Set when the report enters `to_complete`; used by the 24h/96h reminder scheduler
   * as a stable anchor (updated_at would be reset by unrelated edits).
   */
  @Column({ type: 'timestamptz', name: 'to_complete_since', nullable: true })
  toCompleteSince: Date | null;

  @Column({ type: 'timestamptz', name: 'reminder_24h_sent_at', nullable: true })
  reminder24hSentAt: Date | null;

  @Column({ type: 'timestamptz', name: 'reminder_96h_sent_at', nullable: true })
  reminder96hSentAt: Date | null;
}
