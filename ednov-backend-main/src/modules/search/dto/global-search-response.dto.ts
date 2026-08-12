import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponse } from '../../../common/dto/paginated-response';

export class UserListItem {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false, description: 'Display name for students (overrides firstName + lastName)' })
  displayName?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

  @ApiProperty({ required: false })
  establishmentName?: string;

  @ApiProperty({ description: 'Role code: tutor, student, volunteer, admin, coordinator, manager' })
  roleCode: string;

  @ApiProperty({ description: 'Role label for display' })
  roleLabel: string;
}

export class EstablishmentListItem {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  type?: string;

  @ApiProperty({ required: false })
  city?: string;
}

export class GlobalSearchResultsData {
  @ApiProperty({ type: 'object' })
  tutors: PaginatedResponse<UserListItem>;

  @ApiProperty({ type: 'object' })
  students: PaginatedResponse<UserListItem>;

  @ApiProperty({ type: 'object' })
  volunteers: PaginatedResponse<UserListItem>;

  @ApiProperty({ type: 'object' })
  admins: PaginatedResponse<UserListItem>;

  @ApiProperty({ type: 'object' })
  establishments: PaginatedResponse<EstablishmentListItem>;
}

export class GlobalSearchResponseDto {
  @ApiProperty({ type: GlobalSearchResultsData })
  data: GlobalSearchResultsData;

  @ApiProperty({ description: 'Total results across all categories' })
  totalResults: number;
}
