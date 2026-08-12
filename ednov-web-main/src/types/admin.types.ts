import type { UserAccountStatus } from '@/types/user.types';

export type AdminRole = string;

export interface Admin {
  id: string;
  companyId: string;
  firebaseUid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  phone: string | null;
  photoUrl: string | null;
  status: UserAccountStatus;
  managedById?: string | null;
  userRoles?: Array<{
    roleId: string;
    role: { code: string; label: string };
  }>;
  userEstablishments?: Array<{
    id: string;
    establishmentId: string;
    establishment: {
      id: string;
      name: string;
      uaiCode: string | null;
      type: string;
      city: string;
      postalCode: string;
    };
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateAdminDto {
  inviteBy: 'email' | 'phone';
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleIds: string[];
  profileId?: string;
  establishmentIds?: string[];
  managedById?: string;
}

export interface UpdateAdminDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  status?: UserAccountStatus;
  roleIds?: string[];
  establishmentIds?: string[];
  managedById?: string | null;
}

export interface AdminFilters {
  statuses: string[];
  roles: AdminRole[];
}
