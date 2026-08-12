export interface Subject {
  id: string;
  companyId: string;
  label: string;
  code: string;
  description?: string | null;
  educationCycle?: string | null;
  isCore?: boolean;
  status?: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubjectDto {
  label: string;
  code: string;
  description?: string;
  educationCycle?: string;
  isCore?: boolean;
  status?: 'active' | 'inactive';
}

export interface UpdateSubjectDto extends Partial<CreateSubjectDto> {}
