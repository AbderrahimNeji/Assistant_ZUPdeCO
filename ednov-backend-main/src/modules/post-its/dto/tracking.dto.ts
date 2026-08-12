import { IsString, IsOptional, IsInt, Min, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PostItStatus } from '../entities/post-it.entity';

export class TrackingOccurrenceStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  done: number;

  @ApiProperty()
  overdue: number;

  @ApiProperty()
  pending: number;
}

export class TrackingOccurrenceDto {
  @ApiProperty({ description: 'Period key (e.g. v2_m2026-06)' })
  periodKey: string;

  @ApiProperty({ description: 'Human-readable label (e.g. Juin 2026)' })
  label: string;

  @ApiProperty({ description: 'Date of the occurrence' })
  date: Date;

  @ApiProperty({ type: TrackingOccurrenceStatsDto })
  stats: TrackingOccurrenceStatsDto;

  @ApiProperty({ description: 'Whether this occurrence has been provisioned yet' })
  provisioned: boolean;
}

export class TrackingUserDto {
  @ApiProperty()
  postItId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: ['en_cours', 'done', 'depasse'] })
  status: PostItStatus;

  @ApiProperty()
  deadline: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TrackingUsersResponseDto {
  @ApiProperty({ type: [TrackingUserDto] })
  users: TrackingUserDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}

export class GetTrackingUsersQueryDto {
  @ApiProperty({ description: 'Period key to filter by' })
  @IsString()
  periodKey: string;

  @ApiPropertyOptional({ enum: ['en_cours', 'done', 'depasse'] })
  @IsOptional()
  @IsEnum(['en_cours', 'done', 'depasse'])
  status?: PostItStatus;

  @ApiPropertyOptional({ description: 'Search in user names' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class ForceCompleteDto {
  @ApiProperty({ description: 'User ID to mark as complete' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Period key of the occurrence' })
  @IsString()
  periodKey: string;
}
