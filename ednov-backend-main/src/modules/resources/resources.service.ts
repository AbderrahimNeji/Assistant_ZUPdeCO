import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PedagogicalResource } from './entities/pedagogical-resource.entity';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response';
import { getSkipTake } from '../../common/dto/pagination.dto';
import type { PaginatedResponse } from '../../common/dto/paginated-response';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(PedagogicalResource)
    private readonly resourceRepo: Repository<PedagogicalResource>,
  ) {}

  async findAll(
    companyId: string,
    query: ListResourcesQueryDto,
  ): Promise<PaginatedResponse<PedagogicalResource>> {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const { skip, take } = getSkipTake(page, pageSize);

    const qb = this.resourceRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.subject', 'subject')
      .leftJoinAndSelect('r.level', 'level')
      .where('r.companyId = :companyId', { companyId })
      .orderBy('r.sortOrder', 'ASC')
      .addOrderBy('r.title', 'ASC');

    if (query?.subjectId) {
      qb.andWhere('r.subjectId = :subjectId', { subjectId: query.subjectId });
    }
    if (query?.levelId) {
      qb.andWhere('r.levelId = :levelId', { levelId: query.levelId });
    }

    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOne(id: string, companyId: string): Promise<PedagogicalResource> {
    const resource = await this.resourceRepo.findOne({
      where: { id, companyId },
      relations: ['subject', 'level'],
    });
    if (!resource) {
      throw new NotFoundException(`Resource ${id} not found`);
    }
    return resource;
  }
}
