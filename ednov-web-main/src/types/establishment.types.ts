import { UserWithProfile } from './user.types';
import { Room } from './room.types';

export type EstablishmentType = 'primaire' | 'college' | 'lycee' | 'professionnel' | 'other';
export type EstablishmentStatus = 'active' | 'suspended' | 'closed';
export type EstablishmentCategory = 'public' | 'private';
export type EstablishmentPriorityNetwork = 'rep' | 'rep_plus' | 'none';
export type PartnerRelationshipQuality = 'very_bad' | 'bad' | 'average' | 'good' | 'very_good';

export interface EstablishmentContact {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  fonction?: string;
}

export interface CreateEstablishmentClassDto {
  id?: string;
  name: string;
  levelId: string;
  schoolYearId: string;
  studentCount?: number;
}

export interface Manager {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface SpecialtyRef {
  id: string;
  code: string;
  label: string;
}

export interface Establishment {
  id: string;
  companyId: string;
  uaiCode: string;
  name: string;
  officialName?: string | null;
  type?: EstablishmentType | null;
  status: EstablishmentStatus;
  addressLine1?: string | null;
  department?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contacts?: EstablishmentContact[];
  studentQuota?: number | null;
  volunteerQuota?: number | null;
  govData?: Record<string, unknown> | null;
  ipsValue?: number | null;
  ipsYear?: string | null;
  ipsSource?: string | null;
  establiCategory?: EstablishmentCategory | null;
  priorityNetwork?: EstablishmentPriorityNetwork | null;
  isQpv?: boolean | null;
  renewalNextYear?: boolean | null;
  hasDevoirsFaits?: boolean | null;
  hasInternat?: boolean | null;
  involvementLevel?: number | null;
  partnerRelationshipQuality?: PartnerRelationshipQuality | null;
  conventionSigned?: boolean | null;
  engagementStartDate?: Date | null;
  engagementEndDate?: Date | null;
  managedById?: string | null;
  managedBy?: Manager | null;
  createdAt?: Date;
  updatedAt?: Date;
  coordinators?: UserWithProfile[];
  coordinatorIds?: string[];
  roomsCount?: number;
  /** Active VSC linked to this establishment (computed by API). */
  vscCount?: number;
  offeredSpecialties?: SpecialtyRef[];
}

export interface CreateEstablishmentDto {
  uaiCode: string;
  name: string;
  officialName?: string;
  type?: EstablishmentType;
  status?: EstablishmentStatus;
  addressLine1?: string;
  department?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contacts?: EstablishmentContact[];
  studentQuota?: number;
  volunteerQuota?: number;
  govData?: Record<string, unknown>;
  ipsValue?: number;
  ipsYear?: string;
  establiCategory?: EstablishmentCategory;
  priorityNetwork?: EstablishmentPriorityNetwork;
  isQpv?: boolean;
  renewalNextYear?: boolean;
  hasDevoirsFaits?: boolean;
  hasInternat?: boolean;
  involvementLevel?: number;
  partnerRelationshipQuality?: PartnerRelationshipQuality;
  conventionSigned?: boolean;
  engagementStartDate?: string;
  engagementEndDate?: string;
  managedById?: string;
  coordinatorIds?: string[];
  rooms?: Room[];
  classes?: CreateEstablishmentClassDto[];
  offeredSpecialtyIds?: string[];
}

export interface UpdateEstablishmentDto extends Partial<CreateEstablishmentDto> {}

export interface EstablishmentFilters {
  types: EstablishmentType[];
  statuses: EstablishmentStatus[];
}
