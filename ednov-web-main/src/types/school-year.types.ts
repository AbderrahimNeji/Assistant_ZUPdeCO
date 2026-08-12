export interface SchoolYear {
  id: string;
  companyId: string;
  label: string;
  code?: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  status?: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchoolYearDto {
  label: string;
  code?: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  status?: 'active' | 'inactive';
}

export interface UpdateSchoolYearDto extends Partial<CreateSchoolYearDto> {}
