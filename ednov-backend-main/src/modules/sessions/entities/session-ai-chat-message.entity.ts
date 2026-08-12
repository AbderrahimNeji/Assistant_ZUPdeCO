import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { Session } from './session.entity';

@Entity({ name: 'session_ai_chat_messages' })
@Index(['sessionId', 'createdAt'])
export class SessionAiChatMessage extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Relation<Session>;

  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @Column({ type: 'varchar', length: 20 })
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  content: string;
}
