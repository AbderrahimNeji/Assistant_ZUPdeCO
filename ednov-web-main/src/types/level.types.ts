export interface Level {
  id: string;
  companyId: string;
  label: string;
  code: string;
  description?: string | null;
  educationCycle?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  status?: 'active' | 'inactive';
  orderIndex?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLevelDto {
  label: string;
  code: string;
  description?: string;
  educationCycle?: string;
  minAge?: number;
  maxAge?: number;
  status?: 'active' | 'inactive';
}

export interface UpdateLevelDto extends Partial<CreateLevelDto> {}
