import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, LessThan, MoreThanOrEqual } from 'typeorm';
import { PostIt, PostItStatus } from './entities/post-it.entity';
import { PostItShare } from './entities/post-it-share.entity';
import { CreatePostItDto } from './dto/create-post-it.dto';
import { UpdatePostItDto } from './dto/update-post-it.dto';
import { PostItResponseDto, PostItListResponseDto, PostItShareResponseDto } from './dto/post-it-response.dto';
import { PostItSharesService } from './post-it-shares.service';
import { toLocalDateString, parseLocalDate, parseLocalDateEndOfDay } from '../../common/utils/date-parser.utils';

@Injectable()
export class PostItsService {
  constructor(
    @InjectRepository(PostIt)
    private readonly postItRepository: Repository<PostIt>,
    @InjectRepository(PostItShare)
    private readonly postItShareRepository: Repository<PostItShare>,
    private readonly postItSharesService: PostItSharesService,
  ) {}

  async create(createDto: CreatePostItDto, userId: string, companyId: string): Promise<PostItResponseDto> {
    const postIt = this.postItRepository.create({
      ...createDto,
      createdById: userId,
      companyId,
      deadline: createDto.deadline ? new Date(createDto.deadline) : null,
    });

    const saved = await this.postItRepository.save(postIt);
    return this.toResponseDto(saved, 'owner');
  }

  async findAll(
    userId: string,
    companyId: string,
    filters?: {
      archived?: boolean;
      priority?: boolean;
      thematic?: string;
      status?: PostItStatus;
      search?: string;
    },
    page = 1,
    limit = 100,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<PostItListResponseDto> {
    const queryBuilder = this.postItRepository
      .createQueryBuilder('postIt')
      .leftJoinAndSelect('postIt.createdBy', 'createdBy')
      .leftJoin('postIt.shares', 'share')
      .where('postIt.companyId = :companyId', { companyId })
      .andWhere('postIt.deletedAt IS NULL')
      .andWhere('(postIt.createdById = :userId OR share.userId = :userId)', { userId });

    if (filters?.archived !== undefined) {
      queryBuilder.andWhere('postIt.isArchived = :archived', { archived: filters.archived });
    }

    if (filters?.priority !== undefined) {
      queryBuilder.andWhere('postIt.isPriority = :priority', { priority: filters.priority });
    }

    if (filters?.thematic) {
      queryBuilder.andWhere('postIt.thematic = :thematic', { thematic: filters.thematic });
    }

    if (filters?.status) {
      queryBuilder.andWhere('postIt.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(postIt.title ILIKE :search OR postIt.content ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (dateFrom) {
      queryBuilder.andWhere('postIt.deadline >= :dateFrom', { dateFrom: parseLocalDate(dateFrom) });
    }

    if (dateTo) {
      queryBuilder.andWhere('postIt.deadline <= :dateTo', { dateTo: parseLocalDateEndOfDay(dateTo) });
    }

    queryBuilder
      .orderBy('postIt.isPriority', 'DESC')
      .addOrderBy('postIt.deadline', 'ASC', 'NULLS LAST')
      .addOrderBy('postIt.createdAt', 'DESC');

    const [postIts, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const postItDtos = await Promise.all(
      postIts.map(async (postIt) => {
        const permission = await this.postItSharesService.getUserPermission(postIt.id, userId);
        return this.toResponseDto(postIt, permission || 'read');
      }),
    );

    return {
      postIts: postItDtos,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string, companyId: string): Promise<PostItResponseDto> {
    const postIt = await this.postItRepository.findOne({
      where: { id, companyId },
      relations: ['createdBy', 'shares', 'shares.user', 'shares.sharedBy'],
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    const permission = await this.postItSharesService.getUserPermission(id, userId);

    if (!permission) {
      throw new ForbiddenException('You do not have access to this post-it');
    }

    return this.toResponseDto(postIt, permission, true);
  }

  async update(
    id: string,
    updateDto: UpdatePostItDto,
    userId: string,
    companyId: string,
  ): Promise<PostItResponseDto> {
    const postIt = await this.postItRepository.findOne({
      where: { id, companyId },
      relations: ['createdBy'],
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    const permission = await this.postItSharesService.getUserPermission(id, userId);

    if (permission !== 'owner' && permission !== 'write') {
      throw new ForbiddenException('You do not have permission to edit this post-it');
    }

    Object.assign(postIt, {
      ...updateDto,
      deadline: updateDto.deadline !== undefined
        ? updateDto.deadline ? new Date(updateDto.deadline) : null
        : postIt.deadline,
    });

    const updated = await this.postItRepository.save(postIt);
    return this.toResponseDto(updated, permission);
  }

  async remove(id: string, userId: string, companyId: string): Promise<void> {
    const postIt = await this.postItRepository.findOne({
      where: { id, companyId },
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    if (postIt.createdById !== userId) {
      throw new ForbiddenException('Only the creator can archive this post-it');
    }

    // POC-317: Archiver au lieu de soft delete
    postIt.isArchived = true;
    await this.postItRepository.save(postIt);
  }

  async hardDelete(id: string, userId: string, companyId: string): Promise<void> {
    const postIt = await this.postItRepository.findOne({
      where: { id, companyId, isArchived: true, deletedAt: IsNull() },
    });

    if (!postIt) {
      throw new NotFoundException('Archived post-it not found');
    }

    if (postIt.createdById !== userId) {
      throw new ForbiddenException('Only the creator can permanently delete this post-it');
    }

    await this.postItRepository.softRemove(postIt);
  }

  async emptyTrash(userId: string, companyId: string): Promise<number> {
    const archivedPostIts = await this.postItRepository.find({
      where: {
        companyId,
        createdById: userId,
        isArchived: true,
        deletedAt: IsNull(),
      },
    });

    if (archivedPostIts.length === 0) {
      return 0;
    }

    await this.postItRepository.softRemove(archivedPostIts);
    return archivedPostIts.length;
  }

  async toggleArchive(id: string, userId: string, companyId: string): Promise<PostItResponseDto> {
    const postIt = await this.postItRepository.findOne({
      where: { id, companyId },
      relations: ['createdBy'],
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    const permission = await this.postItSharesService.getUserPermission(id, userId);

    if (permission !== 'owner' && permission !== 'write') {
      throw new ForbiddenException('You do not have permission to archive this post-it');
    }

    postIt.isArchived = !postIt.isArchived;
    const updated = await this.postItRepository.save(postIt);
    return this.toResponseDto(updated, permission);
  }

  async togglePriority(id: string, userId: string, companyId: string): Promise<PostItResponseDto> {
    const postIt = await this.postItRepository.findOne({
      where: { id, companyId },
      relations: ['createdBy'],
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    const permission = await this.postItSharesService.getUserPermission(id, userId);

    if (permission !== 'owner' && permission !== 'write') {
      throw new ForbiddenException('You do not have permission to change priority of this post-it');
    }

    postIt.isPriority = !postIt.isPriority;
    const updated = await this.postItRepository.save(postIt);
    return this.toResponseDto(updated, permission);
  }

  async updateStatus(
    id: string,
    status: PostItStatus,
    userId: string,
    companyId: string,
  ): Promise<PostItResponseDto> {
    const postIt = await this.postItRepository.findOne({
      where: { id, companyId },
      relations: ['createdBy'],
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    const permission = await this.postItSharesService.getUserPermission(id, userId);

    // isDefault post-its are read-only in the modal, but the assigned user can toggle their own status
    const canUpdateStatus =
      permission === 'owner' ||
      permission === 'write' ||
      (permission === 'read' && postIt.isDefault && postIt.createdById === userId);

    if (!canUpdateStatus) {
      throw new ForbiddenException('You do not have permission to change status of this post-it');
    }

    postIt.status = status;
    const updated = await this.postItRepository.save(postIt);
    return this.toResponseDto(updated, permission);
  }

  async updateOverdueStatuses(companyId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await this.postItRepository
      .createQueryBuilder()
      .update(PostIt)
      .set({ status: 'depasse' })
      .where('companyId = :companyId', { companyId })
      .andWhere('status != :doneStatus', { doneStatus: 'done' })
      .andWhere('deadline < :now', { now: today })
      .andWhere('deletedAt IS NULL')
      .execute();

    return result.affected || 0;
  }

  private toResponseDto(
    postIt: PostIt,
    permission: 'owner' | 'read' | 'write',
    includeShares = false,
  ): PostItResponseDto {
    const dto: PostItResponseDto = {
      id: postIt.id,
      companyId: postIt.companyId,
      createdById: postIt.createdById,
      createdByName: postIt.createdBy
        ? `${postIt.createdBy.firstName || ''} ${postIt.createdBy.lastName || ''}`.trim() || postIt.createdBy.email || 'Unknown'
        : 'Unknown',
      title: postIt.title,
      thematic: postIt.thematic,
      content: postIt.content,
      deadline: postIt.deadline,
      status: this.calculateStatus(postIt),
      color: postIt.color,
      isArchived: postIt.isArchived,
      isPriority: postIt.isPriority,
      createdAt: postIt.createdAt,
      updatedAt: postIt.updatedAt,
      userPermission: permission,
      isDefault: postIt.isDefault ?? false,
    };

    if (includeShares && postIt.shares) {
      dto.shares = postIt.shares.map((share) => ({
        id: share.id,
        userId: share.userId,
        userName: share.user
          ? `${share.user.firstName || ''} ${share.user.lastName || ''}`.trim() || share.user.email || 'Unknown'
          : 'Unknown',
        userEmail: share.user?.email || '',
        permission: share.permission,
        sharedAt: share.sharedAt,
        sharedById: share.sharedById,
        sharedByName: share.sharedBy
          ? `${share.sharedBy.firstName || ''} ${share.sharedBy.lastName || ''}`.trim() || share.sharedBy.email || 'Unknown'
          : 'Unknown',
      }));
    }

    return dto;
  }

  private calculateStatus(postIt: PostIt): PostItStatus {
    if (postIt.status === 'done') {
      return 'done';
    }

    if (postIt.deadline && toLocalDateString(postIt.deadline) < toLocalDateString(new Date())) {
      return 'depasse';
    }

    return 'en_cours';
  }
}
