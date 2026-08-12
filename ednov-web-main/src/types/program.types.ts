export interface Program {
  id: string;
  companyId: string;
  establishmentId: string;
  schoolYearId: string;
  label: string;
  name?: string;
  code?: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: string;
  rules?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProgramDto {
  establishmentId: string;
  schoolYearId: string;
  label: string;
  name?: string;
  code?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  rules?: Record<string, unknown>;
}

export interface UpdateProgramDto extends Partial<CreateProgramDto> {}
