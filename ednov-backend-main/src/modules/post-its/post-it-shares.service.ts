import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostItShare, PostItPermission } from './entities/post-it-share.entity';
import { PostIt } from './entities/post-it.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PostItSharesService {
  constructor(
    @InjectRepository(PostItShare)
    private readonly postItShareRepository: Repository<PostItShare>,
    @InjectRepository(PostIt)
    private readonly postItRepository: Repository<PostIt>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async shareWithUsers(
    postItId: string,
    userIds: string[],
    permission: PostItPermission,
    sharedById: string,
    companyId: string,
  ): Promise<PostItShare[]> {
    const postIt = await this.postItRepository.findOne({
      where: { id: postItId, companyId },
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    if (postIt.createdById !== sharedById) {
      const existingShare = await this.postItShareRepository.findOne({
        where: { postItId, userId: sharedById },
      });

      if (!existingShare || existingShare.permission !== 'write') {
        throw new ForbiddenException('Only the creator or users with write permission can share this post-it');
      }
    }

    const shares: PostItShare[] = [];

    for (const userId of userIds) {
      if (userId === postIt.createdById) {
        continue;
      }

      const existingShare = await this.postItShareRepository.findOne({
        where: { postItId, userId },
      });

      if (existingShare) {
        existingShare.permission = permission;
        existingShare.sharedById = sharedById;
        shares.push(await this.postItShareRepository.save(existingShare));
      } else {
        const share = this.postItShareRepository.create({
          postItId,
          userId,
          permission,
          sharedById,
        });
        shares.push(await this.postItShareRepository.save(share));
      }
    }

    return shares;
  }

  async shareWithRole(
    postItId: string,
    roleCode: string,
    permission: PostItPermission,
    sharedById: string,
    companyId: string,
  ): Promise<PostItShare[]> {
    const postIt = await this.postItRepository.findOne({
      where: { id: postItId, companyId },
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    if (postIt.createdById !== sharedById) {
      const existingShare = await this.postItShareRepository.findOne({
        where: { postItId, userId: sharedById },
      });

      if (!existingShare || existingShare.permission !== 'write') {
        throw new ForbiddenException('Only the creator or users with write permission can share this post-it');
      }
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'userRole')
      .innerJoin('userRole.role', 'role')
      .where('role.code = :roleCode', { roleCode })
      .andWhere('user.companyId = :companyId', { companyId })
      .andWhere('user.deletedAt IS NULL')
      .getMany();

    const userIds = users.map((u) => u.id).filter((id) => id !== postIt.createdById);

    return this.shareWithUsers(postItId, userIds, permission, sharedById, companyId);
  }

  async removeShare(postItId: string, userId: string, requesterId: string, companyId: string): Promise<void> {
    const postIt = await this.postItRepository.findOne({
      where: { id: postItId, companyId },
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    if (postIt.createdById !== requesterId) {
      const requesterShare = await this.postItShareRepository.findOne({
        where: { postItId, userId: requesterId },
      });

      if (!requesterShare || requesterShare.permission !== 'write') {
        throw new ForbiddenException('Only the creator or users with write permission can remove shares');
      }
    }

    const share = await this.postItShareRepository.findOne({
      where: { postItId, userId },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    await this.postItShareRepository.remove(share);
  }

  async getSharesForPostIt(postItId: string, companyId: string): Promise<PostItShare[]> {
    const postIt = await this.postItRepository.findOne({
      where: { id: postItId, companyId },
    });

    if (!postIt) {
      throw new NotFoundException('Post-it not found');
    }

    return this.postItShareRepository.find({
      where: { postItId },
      relations: ['user', 'sharedBy'],
    });
  }

  async getUserPermission(postItId: string, userId: string): Promise<PostItPermission | 'owner' | null> {
    const postIt = await this.postItRepository.findOne({
      where: { id: postItId },
    });

    if (!postIt) {
      return null;
    }

    // Post-its assignés (isDefault) → toujours 'read' dans le modal (vue lecture seule)
    if (postIt.isDefault) {
      return 'read';
    }

    if (postIt.createdById === userId) {
      return 'owner';
    }

    const share = await this.postItShareRepository.findOne({
      where: { postItId, userId },
    });

    return share ? share.permission : null;
  }
}
