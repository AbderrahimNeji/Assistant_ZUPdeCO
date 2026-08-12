export interface Room {
  id: string;
  companyId: string;
  establishmentId: string;
  name: string;
  label?: string;
  capacity?: number | null;
  floor?: string | null;
  building?: string | null;
  equipment?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoomDto {
  establishmentId: string;
  name: string;
  label?: string;
  capacity?: number;
  floor?: string;
  building?: string;
  equipment?: string[];
}

export interface UpdateRoomDto extends Partial<CreateRoomDto> {}
