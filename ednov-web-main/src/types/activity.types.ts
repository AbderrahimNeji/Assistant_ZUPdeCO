export interface Activity {
  id: string;
  companyId: string;
  activityTypeId: string;
  label: string;
  code?: string;
  description?: string | null;
  status?: 'active' | 'inactive';
  maxTutors?: number | null;
  maxStudents?: number | null;
  maxVolunteers?: number | null;
  maxStudentsPerTutor?: number | null;
  canHasCr?: boolean;
  bot?: boolean;
  withLink?: boolean;
  chat?: boolean;
  activityTypeName?: string;
  activityType?: {
    id: string;
    label: string;
    code?: string;
  };
  orderIndex?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActivityDto {
  activityTypeId?: string;
  label: string;
  code: string;
  description?: string | null;
  status?: 'active' | 'inactive';
  maxTutors?: number | null;
  maxStudents?: number | null;
  maxVolunteers?: number | null;
  maxStudentsPerTutor?: number | null;
  canHasCr?: boolean;
  bot?: boolean;
  withLink?: boolean;
  chat?: boolean;
  activityTypeName?: string | null;
  orderIndex?: number | null;
}

export interface UpdateActivityDto extends Partial<CreateActivityDto> {}

export interface ActivityType {
  id: string;
  companyId: string;
  label: string;
  code?: string;
  description?: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActivityTypeDto {
  label: string;
  code?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateActivityTypeDto extends Partial<CreateActivityTypeDto> {}
