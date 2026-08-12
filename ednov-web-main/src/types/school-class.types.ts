import type { Level } from './level.types';
import type { SchoolYear } from './school-year.types';

export interface SchoolClass {
  id: string;
  companyId: string;
  establishmentId: string;
  schoolYearId: string;
  levelId: string;
  name: string;
  studentCount?: number | null;
  establishment?: { id: string; name: string; uaiCode?: string } | null;
  schoolYear?: Pick<SchoolYear, 'id' | 'code' | 'isCurrent'> | null;
  level?: Pick<Level, 'id' | 'label' | 'code'> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSchoolClassDto {
  establishmentId: string;
  schoolYearId: string;
  levelId: string;
  name: string;
  studentCount?: number;
}

export interface UpdateSchoolClassDto extends Partial<CreateSchoolClassDto> {}
