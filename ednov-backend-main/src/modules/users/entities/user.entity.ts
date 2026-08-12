import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { UserRole } from './user-role.entity';
import { UserProfile } from './user-profile.entity';
import { UserEstablishment } from './user-establishment.entity';
import type { UserStatus } from '../user-status';

export type { UserStatus };

@Entity({ name: 'users' })
@Index(['firebaseUid'], { unique: true, where: 'deleted_at IS NULL' })
@Index(['companyId', 'email'], { unique: true, where: 'deleted_at IS NULL AND email IS NOT NULL' })
@Index(['companyId'])
@Index(['companyId', 'status'])
@Index(['email'], { where: 'email IS NOT NULL' })
export class User extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 128, name: 'firebase_uid' })
  firebaseUid: string;

  @Column({ type: 'varchar', length: 255, name: 'email', nullable: true })
  email: string | null;

  @Column({ type: 'boolean', name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 50, name: 'phone', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 500, name: 'photo_url', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', length: 255, name: 'display_name', nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: UserStatus;

  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'uuid', name: 'managed_by', nullable: true })
  managedById: string | null;

  /** Months remaining until engagement end date — populated on VSC lists only (not persisted) */
  engagementDurationMonths?: number;

  /** Total completed session hours — populated on tutor/volunteer lists only (not persisted) */
  hoursDone?: number;

  /** Attendance rate (%) — populated on tutor/volunteer lists only (not persisted) */
  attendanceRate?: number | null;

  @ManyToOne(() => User, (u) => u.managedUsers, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'managed_by' })
  managedBy: Relation<User> | null;

  @OneToMany(() => User, (u) => u.managedBy)
  managedUsers: Relation<User[]>;

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles: Relation<UserRole>[];

  @OneToMany(() => UserProfile, (up) => up.user)
  userProfiles: Relation<UserProfile>[];

  @OneToMany(() => UserEstablishment, (ue) => ue.user)
  userEstablishments: Relation<UserEstablishment>[];
}
