import { PostItThematic, PostItColor, PostItStatus } from '../entities/post-it.entity';
import { PostItPermission } from '../entities/post-it-share.entity';

export class PostItShareResponseDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  permission: PostItPermission;
  sharedAt: Date;
  sharedById: string;
  sharedByName: string;
}

export class PostItResponseDto {
  id: string;
  companyId: string;
  createdById: string;
  createdByName: string;
  title: string;
  thematic: PostItThematic;
  content: string;
  deadline: Date | null;
  status: PostItStatus;
  color: PostItColor;
  isArchived: boolean;
  isPriority: boolean;
  createdAt: Date;
  updatedAt: Date;
  userPermission: PostItPermission | 'owner';
  isDefault?: boolean;
  shares?: PostItShareResponseDto[];
}

export class PostItListResponseDto {
  postIts: PostItResponseDto[];
  total: number;
  page: number;
  limit: number;
}
