import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { Profile } from '../../profiles/entities/profile.entity';
import { Level } from '../../academic/entities/level.entity';
import { SchoolClass } from '../../academic/entities/school-class.entity';
import { UserProfileSpecialty } from '../../specialties/entities/user-profile-specialty.entity';
import type { ProfessionalSituation } from '../professional-situation';
import { PROFESSIONAL_SITUATION_VALUES } from '../professional-situation';

export type TutorPlatformStatus = 'pending' | 'active';

@Entity({ name: 'user_profiles' })
@Index(['userId'])
export class UserProfile extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.userProfiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'profile_id', nullable: true })
  profileId: string | null;

  @ManyToOne(() => Profile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'profile_id' })
  profile: Relation<Profile> | null;

  @Column({ type: 'varchar', length: 255, name: 'profile_label', nullable: true })
  profileLabel: string | null;

  @Column({ type: 'varchar', length: 10, name: 'date_of_birth', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'varchar', length: 1, name: 'gender', nullable: true })
  gender: 'M' | 'F' | 'O' | null;

  @Column({ type: 'varchar', length: 200, name: 'address_legacy', nullable: true })
  addressLegacy: string | null;

  @Column({ type: 'varchar', length: 255, name: 'address_line1', nullable: true })
  addressLine1: string | null;

  @Column({ type: 'varchar', length: 100, name: 'department', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 20, name: 'postal_code', nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 100, name: 'city', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 2, name: 'country', default: 'FR' })
  country: string;

  @Column({ type: 'uuid', name: 'level_id', nullable: true })
  levelId: string | null;

  @ManyToOne(() => Level, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'level_id' })
  level: Relation<Level> | null;

  @Column({ type: 'uuid', name: 'school_class_id', nullable: true })
  schoolClassId: string | null;

  @ManyToOne(() => SchoolClass, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'school_class_id' })
  schoolClass: Relation<SchoolClass> | null;

  @Column({ type: 'varchar', length: 500, name: 'medical_notes', nullable: true })
  medicalNotes: string | null;

  @Column({ type: 'jsonb', name: 'subjects', nullable: true })
  subjects: unknown[] | null;

  @Column({ type: 'jsonb', name: 'subject_names', nullable: true })
  subjectNames: string[] | null;

  @Column({ type: 'jsonb', name: 'availability', nullable: true })
  availability: Record<string, unknown> | null;

  @Column({ type: 'boolean', name: 'is_minor', default: false })
  isMinor: boolean;

  @Column({ type: 'boolean', name: 'has_special_needs', default: false })
  hasSpecialNeeds: boolean;

  @Column({ type: 'varchar', length: 50, name: 'special_needs_type', nullable: true })
  specialNeedsType: string | null;

  @Column({ type: 'varchar', length: 200, name: 'special_needs_note', nullable: true })
  specialNeedsNote: string | null;

  @Column({ type: 'boolean', name: 'is_disabled', default: false })
  isDisabled: boolean;

  @Column({ type: 'jsonb', name: 'disability_types', nullable: true })
  disabilityTypes: string[] | null;

  @Column({ type: 'varchar', length: 200, name: 'disability_other_note', nullable: true })
  disabilityOtherNote: string | null;

  @Column({ type: 'jsonb', name: 'guardian_contact', nullable: true })
  guardianContact: Record<string, unknown> | null;

  @Column({ 
    type: 'jsonb', 
    name: 'vsc_reports_frequencies',
    default: { daily: false, weekly: false },
    nullable: true 
  })
  vscReportsFrequencies: {
    daily: boolean;
    weekly: boolean;
  } | null;

  @Column({ type: 'varchar', length: 20, name: 'tutor_platform_status', default: 'active' })
  tutorPlatformStatus: TutorPlatformStatus;

  @Column({
    type: 'enum',
    enum: [...PROFESSIONAL_SITUATION_VALUES],
    enumName: 'professional_situation_enum',
    name: 'professional_situation',
    nullable: true,
  })
  professionalSituation: ProfessionalSituation | null;

  @Column({ type: 'date', name: 'engagement_start_date', nullable: true })
  engagementStartDate: Date | null;

  @Column({ type: 'date', name: 'engagement_end_date', nullable: true })
  engagementEndDate: Date | null;

  @Column({ type: 'timestamptz', name: 'exit_date', nullable: true })
  exitDate: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'target_hours', nullable: true })
  targetHours: number | null;

  @Column({ type: 'varchar', length: 100, name: 'exit_reason', nullable: true })
  exitReason: string | null;

  @Column({ type: 'varchar', length: 200, name: 'exit_reason_note', nullable: true })
  exitReasonNote: string | null;

  @OneToMany(() => UserProfileSpecialty, (ups) => ups.userProfile)
  userProfileSpecialties: Relation<UserProfileSpecialty[]>;
}
