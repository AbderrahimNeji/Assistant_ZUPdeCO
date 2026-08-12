import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactFunction } from './entities/contact-function.entity';
import { CreateContactFunctionDto, UpdateContactFunctionDto, ContactFunctionResponseDto } from './dto/contact-function.dto';

@Injectable()
export class ContactFunctionsService {
  constructor(
    @InjectRepository(ContactFunction)
    private readonly contactFunctionRepository: Repository<ContactFunction>,
  ) {}

  async findAll(companyId: string): Promise<ContactFunctionResponseDto[]> {
    const functions = await this.contactFunctionRepository.find({
      where: { companyId },
      order: { 
        isDefault: 'DESC',
        usageCount: 'DESC',
        label: 'ASC',
      },
    });

    return functions.map(func => this.toResponseDto(func));
  }

  async findOne(id: string, companyId: string): Promise<ContactFunctionResponseDto> {
    const func = await this.contactFunctionRepository.findOne({
      where: { id, companyId },
    });

    if (!func) {
      throw new NotFoundException(`Contact function with ID ${id} not found`);
    }

    return this.toResponseDto(func);
  }

  async create(companyId: string, dto: CreateContactFunctionDto): Promise<ContactFunctionResponseDto> {
    // Check if function with same label already exists
    const existing = await this.contactFunctionRepository.findOne({
      where: { companyId, label: dto.label },
    });

    if (existing) {
      throw new ConflictException(`A function with label "${dto.label}" already exists`);
    }

    const func = this.contactFunctionRepository.create({
      companyId,
      label: dto.label,
      isDefault: false,
      usageCount: 0,
    });

    const saved = await this.contactFunctionRepository.save(func);
    return this.toResponseDto(saved);
  }

  async update(id: string, companyId: string, dto: UpdateContactFunctionDto): Promise<ContactFunctionResponseDto> {
    const func = await this.contactFunctionRepository.findOne({
      where: { id, companyId },
    });

    if (!func) {
      throw new NotFoundException(`Contact function with ID ${id} not found`);
    }

    // If updating label, check for conflicts
    if (dto.label && dto.label !== func.label) {
      const existing = await this.contactFunctionRepository.findOne({
        where: { companyId, label: dto.label },
      });

      if (existing) {
        throw new ConflictException(`A function with label "${dto.label}" already exists`);
      }
    }

    Object.assign(func, dto);
    const updated = await this.contactFunctionRepository.save(func);
    return this.toResponseDto(updated);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const func = await this.contactFunctionRepository.findOne({
      where: { id, companyId },
    });

    if (!func) {
      throw new NotFoundException(`Contact function with ID ${id} not found`);
    }

    await this.contactFunctionRepository.softDelete(id);
  }

  async incrementUsageCount(companyId: string, label: string): Promise<void> {
    const func = await this.contactFunctionRepository.findOne({
      where: { companyId, label },
    });

    if (func) {
      func.usageCount += 1;
      await this.contactFunctionRepository.save(func);
    }
  }

  async getOrCreateFunction(companyId: string, label: string): Promise<ContactFunctionResponseDto> {
    let func = await this.contactFunctionRepository.findOne({
      where: { companyId, label },
    });

    if (func) {
      await this.incrementUsageCount(companyId, label);
    } else {
      func = this.contactFunctionRepository.create({
        companyId,
        label,
        isDefault: false,
        usageCount: 1,
      });
      func = await this.contactFunctionRepository.save(func);
    }

    return this.toResponseDto(func);
  }

  private toResponseDto(func: ContactFunction): ContactFunctionResponseDto {
    return {
      id: func.id,
      companyId: func.companyId,
      label: func.label,
      isDefault: func.isDefault,
      usageCount: func.usageCount,
      createdAt: func.createdAt,
      updatedAt: func.updatedAt,
    };
  }
}
