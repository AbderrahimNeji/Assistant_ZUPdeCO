import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { UserProfile } from '../../users/entities/user-profile.entity';
import { Specialty } from './specialty.entity';

@Entity({ name: 'user_profile_specialties' })
export class UserProfileSpecialty {
  @PrimaryColumn({ type: 'uuid', name: 'user_profile_id' })
  userProfileId: string;

  @ManyToOne(() => UserProfile, (up) => up.userProfileSpecialties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_profile_id' })
  userProfile: Relation<UserProfile>;

  @PrimaryColumn({ type: 'uuid', name: 'specialty_id' })
  specialtyId: string;

  @ManyToOne(() => Specialty, (s) => s.userProfileLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Relation<Specialty>;
}
