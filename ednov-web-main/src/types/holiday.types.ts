export interface VacationZoneRef {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface Holiday {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  type: 'national' | 'regional' | 'establishment_specific';
  vacationZoneId?: string | null;
  vacationZone?: VacationZoneRef | null;
  establishmentId?: string | null;
  establishmentName?: string | null;
  isRecurringYearly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHolidayDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: 'national' | 'regional' | 'establishment_specific';
  vacationZoneId?: string | null;
  establishmentId?: string;
  establishmentName?: string;
  isRecurringYearly?: boolean;
}

export interface UpdateHolidayDto extends Partial<CreateHolidayDto> {}
