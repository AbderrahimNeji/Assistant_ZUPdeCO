import { Entity, Column, Index, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PostIt } from './post-it.entity';
import { User } from '../../users/entities/user.entity';

export type PostItPermission = 'read' | 'write';

@Entity({ name: 'post_it_shares' })
@Index(['postItId', 'userId'], { unique: true })
@Index(['userId'])
export class PostItShare extends BaseEntity {
  @Column({ type: 'uuid', name: 'post_it_id' })
  postItId: string;

  @ManyToOne(() => PostIt, (postIt) => postIt.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_it_id' })
  postIt: PostIt;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 10, name: 'permission', default: 'read' })
  permission: PostItPermission;

  @CreateDateColumn({ type: 'timestamptz', name: 'shared_at' })
  sharedAt: Date;

  @Column({ type: 'uuid', name: 'shared_by_id' })
  sharedById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_by_id' })
  sharedBy: User;
}
