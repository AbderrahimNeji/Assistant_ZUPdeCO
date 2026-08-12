import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DeepPartial, In, DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { Company } from './entities/company.entity';
import {
  Establishment,
  EstablishmentType,
  EstablishmentStatus,
  EstablishmentCategory,
  EstablishmentPriorityNetwork,
  PartnerRelationshipQuality,
  CalendarType,
  EstablishmentContact,
} from './entities/establishment.entity';
import { Room } from './entities/room.entity';
import { Session } from '../sessions/entities/session.entity';
import { User } from '../users/entities/user.entity';
import { EstablishmentCoordinator } from './entities/establishment-coordinator.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';import { UpdateEstablishmentDto } from './dto/update-establishment.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AuditLogService } from '../audit/audit.service';
import { ContactFunctionsService } from './contact-functions.service';
import { SpecialtiesService } from '../specialties/specialties.service';
import { Specialty } from '../specialties/entities/specialty.entity';
import { createPaginatedResponse } from '../../common/dto/paginated-response';
import {
  buildXlsxBuffer,
  buildXlsxBufferStreaming,
  type ExcelCellValue,
} from '../../common/utils/excel-export.util';
import { getSkipTake } from '../../common/dto/pagination.dto';
import type { PaginatedResponse } from '../../common/dto/paginated-response';
import { formatExportDate } from '../../common/utils/format.utils';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';

const ROLES_RESTRICTED_TO_ESTABLISHMENTS = [
  'COORDINATOR',
  'COORDINATEUR',
  'CORDINATEUR',
  'VOLUNTEER',
  'VSC',
  'PROFESSOR',
  'PROFESSEUR',
];

function getEstablishmentExportBatchSize(): number {
  const n = Number.parseInt(process.env.ESTABLISHMENT_EXPORT_BATCH_SIZE ?? '2000', 10);
  if (!Number.isFinite(n) || n < 100) return 2000;
  return Math.min(n, 10_000);
}

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
    @InjectRepository(EstablishmentCoordinator)
    private readonly establishmentCoordinatorRepository: Repository<EstablishmentCoordinator>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(SchoolClass)
    private readonly schoolClassRepository: Repository<SchoolClass>,
    private readonly auditLogService: AuditLogService,
    @Inject(forwardRef(() => ContactFunctionsService))
    private readonly contactFunctionsService: ContactFunctionsService,
    private readonly specialtiesService: SpecialtiesService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
  ) {}

  private shouldRestrictToUserEstablishments(roleCodes?: string[]): boolean {
    if (!roleCodes?.length) return false;
    const upper = new Set(roleCodes.map((code) => (code ?? '').toUpperCase()));
    return ROLES_RESTRICTED_TO_ESTABLISHMENTS.some((role) => upper.has(role));
  }

  private async getUserScopedEstablishmentIds(
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<string[] | null> {
    if (!userId || !this.shouldRestrictToUserEstablishments(roleCodes)) {
      return null;
    }
    const rows = await this.establishmentRepository
      .createQueryBuilder('e')
      .select('e.id', 'id')
      .innerJoin(
        'user_establishments',
        'ue',
        'ue.establishment_id = e.id AND ue.company_id = :companyId AND ue.user_id = :userId',
        { companyId, userId },
      )
      .where('e.company_id = :companyId', { companyId })
      .andWhere('e.deleted_at IS NULL')
      .getRawMany<{ id: string }>();
    return rows.map((row) => row.id).filter(Boolean);
  }

  /**
   * Count active volunteers (VSC) per establishment (same rule as dashboard vsc_counts CTE).
   */
  private async countActiveVolunteersByEstablishmentIds(
    companyId: string,
    establishmentIds: string[],
  ): Promise<Map<string, number>> {
    if (establishmentIds.length === 0) {
      return new Map();
    }

    const rows: { establishment_id: string; vsc_count: string | number }[] =
      await this.dataSource.query(
        `
        SELECT ue.establishment_id, COUNT(DISTINCT u.id) AS vsc_count
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id AND r.company_id = $1 AND r.deleted_at IS NULL
        INNER JOIN user_establishments ue ON ue.user_id = u.id
        WHERE u.company_id = $1
          AND LOWER(r.code) = 'volunteer'
          AND u.status = 'active'
          AND u.deleted_at IS NULL
          AND ue.establishment_id = ANY($2::uuid[])
        GROUP BY ue.establishment_id
        `,
        [companyId, establishmentIds],
      );

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.establishment_id, Number(row.vsc_count) || 0);
    }
    return counts;
  }

  private async attachVscCounts(
    companyId: string,
    establishments: Establishment[],
  ): Promise<void> {
    if (establishments.length === 0) {
      return;
    }
    const counts = await this.countActiveVolunteersByEstablishmentIds(
      companyId,
      establishments.map((e) => e.id),
    );
    for (const establishment of establishments) {
      establishment.vscCount = counts.get(establishment.id) ?? 0;
    }
  }

  private async attachStudentCounts(
    companyId: string,
    establishments: Establishment[],
  ): Promise<void> {
    if (establishments.length === 0) return;
    const ids = establishments.map((e) => e.id);
    const rows: { establishment_id: string; cnt: string }[] =
      await this.establishmentRepository.query(
        `SELECT ue.establishment_id, COUNT(*)::int AS cnt
         FROM user_establishments ue
         JOIN users u ON u.id = ue.user_id
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
         WHERE ue.establishment_id = ANY($1)
           AND ue.company_id = $2
           AND r.code = 'student'
           AND u.deleted_at IS NULL
         GROUP BY ue.establishment_id`,
        [ids, companyId],
      );
    const counts = new Map(rows.map((r) => [r.establishment_id, Number(r.cnt)]));
    for (const e of establishments) {
      e.studentQuota = counts.get(e.id) ?? 0;
    }
  }

  /**
   * Validate that coordinators exist, belong to the company, and have COORDINATOR role.
   */
  private async assertCoordinatorsExist(
    companyId: string,
    coordinatorIds: string[],
  ): Promise<void> {
    if (!coordinatorIds.length) return;

    const unique = [...new Set(coordinatorIds)];
    const users = await this.userRepository.find({
      where: { id: In(unique), companyId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (users.length !== unique.length) {
      throw new BadRequestException(
        'One or more coordinators do not exist or do not belong to this company',
      );
    }

    for (const user of users) {
      const hasCoordinatorRole = user.userRoles?.some(
        (ur) => ur.role?.code?.toUpperCase() === 'COORDINATOR',
      );
      if (!hasCoordinatorRole) {
        throw new BadRequestException(
          `User ${user.id} does not have the COORDINATOR role`,
        );
      }
    }
  }

  private normalizeContacts(
    contacts: Array<{ contactName?: string; contactEmail?: string; contactPhone?: string; fonction?: string }> | undefined,
  ): EstablishmentContact[] {
    if (!Array.isArray(contacts) || contacts.length === 0) return [];
    return contacts
      .map((contact) => ({
        contactName: contact.contactName?.trim() || undefined,
        contactEmail: contact.contactEmail?.trim() || undefined,
        contactPhone: contact.contactPhone?.trim() || undefined,
        fonction: contact.fonction?.trim() || undefined,
      }))
      .filter((contact) => contact.contactName || contact.contactEmail || contact.contactPhone);
  }

  private async registerContactFunctions(
    companyId: string,
    contacts: Array<{ fonction?: string }> | undefined,
  ): Promise<void> {
    if (!Array.isArray(contacts) || contacts.length === 0) return;

    const functions = contacts
      .map((c) => c.fonction?.trim())
      .filter((f): f is string => !!f && f.length > 0);

    const uniqueFunctions = [...new Set(functions)];

    for (const label of uniqueFunctions) {
      await this.contactFunctionsService.getOrCreateFunction(companyId, label);
    }
  }

  /**
   * Valide les classes soumises : champs obligatoires + absence de doublons (name + levelId).
   * Lève une BadRequestException avant toute écriture en base.
   */
  private validateClassDtos(
    classes: Array<{ id?: string; name?: string; levelId?: string; schoolYearId?: string }>,
  ): void {
    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      if (!cls.name?.trim()) {
        throw new BadRequestException(
          `Classe #${i + 1} : le champ "nom" est obligatoire.`,
        );
      }
      if (!cls.levelId) {
        throw new BadRequestException(
          `Classe #${i + 1} ("${cls.name.trim()}") : le champ "niveau" est obligatoire.`,
        );
      }
      if (!cls.schoolYearId) {
        throw new BadRequestException(
          `Classe #${i + 1} ("${cls.name.trim()}") : le champ "année scolaire" est obligatoire.`,
        );
      }
    }

    // Détection des doublons (nom + année scolaire — correspond à la contrainte DB)
    const seen = new Map<string, number>();
    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      const key = `${cls.name!.trim().toLowerCase()}::${cls.schoolYearId}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Doublon détecté : la classe "${cls.name!.trim()}" existe déjà pour cette année scolaire (entrée #${seen.get(key)! + 1} et #${i + 1}).`,
        );
      }
      seen.set(key, i);
    }
  }

  private async syncEstablishmentRooms(
    establishmentId: string,
    companyId: string,
    rooms: Array<{ id?: string; name: string; label?: string; capacity?: number }>,
  ): Promise<void> {
    const existingRooms = await this.roomRepository.find({
      where: { establishmentId, companyId },
    });

    const existingRoomIds = new Set(existingRooms.map((r) => r.id));
    const incomingRoomIds = new Set(rooms.filter((r) => r.id).map((r) => r.id));

    const roomsToCreate = rooms.filter((r) => !r.id && r.name?.trim());
    const roomsToUpdate = rooms.filter((r) => r.id && existingRoomIds.has(r.id));
    const roomsToDelete = existingRooms.filter((r) => !incomingRoomIds.has(r.id));

    for (const room of roomsToCreate) {
      await this.roomRepository.save(
        this.roomRepository.create({
          establishmentId,
          companyId,
          name: room.name,
          label: room.label || null,
          capacity: room.capacity || null,
        }),
      );
    }

    for (const room of roomsToUpdate) {
      await this.roomRepository.update(room.id!, {
        name: room.name,
        label: room.label || null,
        capacity: room.capacity || null,
      });
    }

    for (const room of roomsToDelete) {
      await this.roomRepository.softDelete(room.id);
    }
  }

  /**
   * Replace all establishment_coordinators rows for this establishment.
   */
  async replaceEstablishmentCoordinatorLinks(
    establishmentId: string,
    companyId: string,
    coordinatorIds: string[],
  ): Promise<void> {
    await this.establishmentCoordinatorRepository.delete({ establishmentId, companyId });
    if (!coordinatorIds.length) return;

    await this.assertCoordinatorsExist(companyId, coordinatorIds);

    const links = coordinatorIds.map((coordinatorId) =>
      this.establishmentCoordinatorRepository.create({
        establishmentId,
        companyId,
        coordinatorId,
      }),
    );
    await this.establishmentCoordinatorRepository.save(links);
  }

  /**
   * Get all coordinators for an establishment.
   */
  async getEstablishmentCoordinators(establishmentId: string): Promise<User[]> {
    const links = await this.establishmentCoordinatorRepository.find({
      where: { establishmentId },
      relations: ['coordinator'],
    });
    return links.map((link) => link.coordinator);
  }

  async create(dto: CreateCompanyDto, actorId?: string): Promise<Company> {
    const existing = await this.companyRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Company with code "${dto.code}" already exists`);

    const company = this.companyRepository.create(dto);
    const saved = await this.companyRepository.save(company);

    await this.auditLogService.log({
      companyId: saved.id,
      userId: actorId,
      entity: 'companies',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    filters?: { status?: string; code?: string; q?: string },
  ): Promise<PaginatedResponse<Company>> {
    const { skip, take } = getSkipTake(page, pageSize);

    if (!filters?.status && !filters?.code && !filters?.q) {
      const [data, total] = await this.companyRepository.findAndCount({
        order: { createdAt: 'DESC' },
        skip,
        take,
      });
      return createPaginatedResponse(data, total, page, pageSize);
    }

    const qb = this.companyRepository
      .createQueryBuilder('company')
      .orderBy('company.created_at', 'DESC');

    if (filters.status) {
      qb.andWhere('company.status = :status', { status: filters.status });
    }
    if (filters.code?.trim()) {
      qb.andWhere('UNACCENT(company.code) ILIKE UNACCENT(:code)', {
        code: `%${filters.code.trim()}%`,
      });
    }
    if (filters.q?.trim()) {
      const search = `%${filters.q.trim()}%`;
      qb.andWhere('(UNACCENT(company.name) ILIKE UNACCENT(:search) OR UNACCENT(company.code) ILIKE UNACCENT(:search))', {
        search,
      });
    }

    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, actorId?: string): Promise<Company> {
    const company = await this.findOne(id);
    const oldValue = { ...company } as unknown as Record<string, unknown>;

    Object.assign(company, dto);
    const saved = await this.companyRepository.save(company);

    await this.auditLogService.log({
      companyId: id,
      userId: actorId,
      entity: 'companies',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async remove(id: string, actorId?: string): Promise<void> {
    const company = await this.findOne(id);

    await this.auditLogService.log({
      companyId: id,
      userId: actorId,
      entity: 'companies',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: company.id, code: company.code } as Record<string, unknown>,
    });

    await this.companyRepository.softDelete(id);
  }

  async findEstablishments(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: { types?: EstablishmentType[]; statuses?: EstablishmentStatus[]; coordinatorId?: string; managedById?: string; specialtyIds?: string[]; categories?: EstablishmentCategory[]; priorityNetworks?: EstablishmentPriorityNetwork[]; isQpv?: boolean | null; search?: string; cities?: string[]; departments?: string[] },
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
    actionScopes?: Map<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<Establishment>> {
    try {
      console.log('[findEstablishments] START - Filters:', JSON.stringify(filters, null, 2));
      const { skip, take } = getSkipTake(page, pageSize);

      const qb = this.establishmentRepository
        .createQueryBuilder('establishment')
        .loadRelationCountAndMap('establishment.roomsCount', 'establishment.rooms')
        .where('establishment.company_id = :companyId', { companyId });

      if (visibilityScope) {
        await this.visibilityScopeResolver.applyToQueryBuilder(
          qb,
          visibilityScope,
          'establishments',
          { userId: userId!, companyId },
        );
      } else {
        const scopedEstablishmentIds = await this.getUserScopedEstablishmentIds(companyId, userId, roleCodes);
        if (scopedEstablishmentIds) {
          if (scopedEstablishmentIds.length === 0) {
            return createPaginatedResponse([], 0, page, pageSize);
          }
          qb.andWhere('establishment.id IN (:...scopedEstablishmentIds)', { scopedEstablishmentIds });
        }
      }

      console.log('[findEstablishments] Query builder initialized');

      if (filters?.types && filters.types.length > 0) {
        qb.andWhere('establishment.type IN (:...types)', { types: filters.types });
        console.log('[findEstablishments] Added types filter:', filters.types);
      }
      if (filters?.statuses && filters.statuses.length > 0) {
        qb.andWhere('establishment.status IN (:...statuses)', { statuses: filters.statuses });
        console.log('[findEstablishments] Added statuses filter:', filters.statuses);
      }
      if (filters?.coordinatorId) {
        console.log('[findEstablishments] Adding coordinator subquery for:', filters.coordinatorId);
        qb.andWhere(
          'establishment.id IN (SELECT ec.establishment_id FROM establishment_coordinators ec WHERE ec.coordinator_id = :coordinatorId)',
          { coordinatorId: filters.coordinatorId },
        );
        console.log('[findEstablishments] Coordinator subquery added');
      }
      if (filters?.managedById) {
        console.log('[findEstablishments] Adding managedById filter for:', filters.managedById);
        qb.andWhere('establishment.managed_by_id = :managedById', { managedById: filters.managedById });
        console.log('[findEstablishments] ManagedById filter added');
      }
      if (filters?.specialtyIds && filters.specialtyIds.length > 0) {
        qb.andWhere(
          'establishment.id IN (SELECT es.establishment_id FROM establishment_specialties es WHERE es.specialty_id IN (:...specialtyIds))',
          { specialtyIds: filters.specialtyIds },
        );
      }
      if (filters?.categories && filters.categories.length > 0) {
        qb.andWhere('establishment.establi_category IN (:...categories)', { categories: filters.categories });
      }
      if (filters?.priorityNetworks && filters.priorityNetworks.length > 0) {
        qb.andWhere('establishment.priority_network IN (:...priorityNetworks)', { priorityNetworks: filters.priorityNetworks });
      }
      if (filters?.isQpv !== undefined && filters.isQpv !== null) {
        qb.andWhere('establishment.is_qpv = :isQpv', { isQpv: filters.isQpv });
      }
      if (filters?.search && filters.search.length >= 2) {
        qb.andWhere('UNACCENT(establishment.name) ILIKE UNACCENT(:search)', {
          search: `%${filters.search}%`,
        });
      }
      if (filters?.cities && filters.cities.length > 0) {
        qb.andWhere('UNACCENT(establishment.city) ILIKE ANY(ARRAY[:...cities]::text[])', {
          cities: filters.cities.map((c) => `%${c}%`),
        });
      }
      if (filters?.departments && filters.departments.length > 0) {
        const codeDepts = filters.departments.filter((d) => /^\d{2,3}$/.test(d));
        const nameDepts = filters.departments.filter((d) => !/^\d{2,3}$/.test(d));
        if (codeDepts.length > 0) {
          qb.andWhere('establishment.postal_code LIKE ANY(ARRAY[:...deptPrefixes]::text[])', {
            deptPrefixes: codeDepts.map((d) => `${d}%`),
          });
        }
        if (nameDepts.length > 0) {
          qb.andWhere(
            'UNACCENT(establishment.department) ILIKE ANY(ARRAY[:...deptNames]::text[])',
            { deptNames: nameDepts.map((d) => `%${d}%`) },
          );
        }
      }

      console.log('[findEstablishments] Adding orderBy');
      qb.orderBy('establishment.created_at', 'DESC');

      console.log('[findEstablishments] Query built, executing getManyAndCount...');
      console.log('[findEstablishments] SQL Query:', qb.getSql());
      console.log('[findEstablishments] Parameters:', qb.getParameters());

      const [data, total] = await qb.skip(skip).take(take).getManyAndCount();

      // Calcul des _permissions si actionScopes fourni
      if (actionScopes && actionScopes.size > 0) {
        const allEstablishmentIds = data.map((e) => e.id);
        for (const [action, scope] of actionScopes.entries()) {
          if (!scope) continue;
          const allowedIds = await this.visibilityScopeResolver.resolveEntityIds(
            allEstablishmentIds,
            'id',
            scope,
            'establishments',
            { userId: userId!, companyId },
          );
          for (const establishment of data) {
            if (!(establishment as any)._permissions) {
              (establishment as any)._permissions = {};
            }
            (establishment as any)._permissions[action] = allowedIds.has(establishment.id);
          }
        }
      }

      await this.attachVscCounts(companyId, data);
      await this.attachStudentCounts(companyId, data);


      console.log('[findEstablishments] SUCCESS - Results count:', data.length, 'Total:', total);
      return createPaginatedResponse(data, total, page, pageSize);
    } catch (error) {
      console.error('[findEstablishments] ERROR CAUGHT:', error);
      console.error('[findEstablishments] Error message:', error.message);
      console.error('[findEstablishments] Error stack:', error.stack);
      console.error('[findEstablishments] Filters that caused error:', JSON.stringify(filters, null, 2));
      throw error;
    }
  }

  /**
   * Export establishments as Excel (optionally filtered).
   * Mirrors `findEstablishments` filtering + access scoping, but without pagination.
   * Uses streaming XLSX + batched reads so very large exports (50k+ rows) do not OOM.
   */
  async exportEstablishmentsCsv(
    companyId: string,
    filters?: {
      types?: EstablishmentType[];
      statuses?: EstablishmentStatus[];
      coordinatorId?: string;
      managedById?: string;
    },
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<Buffer> {
    const headerRow = [
      'id',
      'name',
      'officialName',
      'type',
      'status',
      'addressLine1',
      'postalCode',
      'city',
      'country',
      'contactName',
      'contactEmail',
      'contactPhone',
      'Nb élèves (calculé)',
      'volunteerQuota',
      'Date de début partenariat',
      'Date fin partenariat',
      'Nbre de VSC',
      'createdAt',
      'Catégorie',
      'Réseau prioritaire',
      'QPV',
      'Reconduction N+1',
      'IPS valeur',
      'IPS année',
      'Convention signée',
      'Présence Devoirs Faits',
      'Présence internat',
      "Niveau d'implication",
      'Qualité relation partenaire',
    ];

    const qb = await this.buildEstablishmentExportBaseQuery(companyId, filters, userId, roleCodes, visibilityScope);
    if (!qb) {
      return buildXlsxBuffer({
        sheetName: 'Établissements',
        headerRow,
        dataRows: [],
      });
    }

    const batchSize = getEstablishmentExportBatchSize();

    return buildXlsxBufferStreaming({
      sheetName: 'Établissements',
      headerRow,
      writeBody: async (sheet) => {
        let offset = 0;
        let batchIndex = 0;
        while (true) {
          const batch = await qb.clone().skip(offset).take(batchSize).getMany();
          if (batch.length === 0) break;
          await this.attachVscCounts(companyId, batch);
          await this.attachStudentCounts(companyId, batch);
          for (const e of batch) {
            sheet.addRow(this.mapEstablishmentToExportExcelRow(e)).commit();
          }
          offset += batch.length;
          batchIndex += 1;
          if (batchIndex % 10 === 0) {
            this.logger.log(`exportEstablishmentsCsv: streamed ${offset} establishment rows`);
          }
          if (batch.length < batchSize) break;
        }
      },
    });
  }

  private mapEstablishmentToExportExcelRow(e: Establishment): ExcelCellValue[] {
    const PARTNER_RELATIONSHIP_QUALITY_LABELS: Record<string, string> = {
      very_bad: 'Très mauvaise',
      bad: 'Mauvaise',
      average: 'Moyenne',
      good: 'Bonne',
      very_good: 'Très bonne',
    };
    const dateDebutPartenariat =
      e.engagementStartDate instanceof Date ? e.engagementStartDate.toISOString().slice(0, 10) : '';
    const dateFinPartenariat =
      e.engagementEndDate instanceof Date ? e.engagementEndDate.toISOString().slice(0, 10) : '';

    const TYPE_LABELS: Record<string, string> = {
      lycee: 'Lycée général',
      professionnel: 'Lycée professionnel',
      primaire: 'École',
      college: 'Collège',
      other: 'Autre',
    };

    return [
      e.id,
      e.name ?? '',
      e.officialName ?? '',
      TYPE_LABELS[e.type ?? ''] ?? e.type ?? '',
      e.status ?? '',
      e.addressLine1 ?? '',
      e.postalCode ?? '',
      e.city ?? '',
      e.country ?? '',
      e.contactName ?? '',
      e.contactEmail ?? '',
      e.contactPhone ?? '',
      e.studentQuota ?? '',
      e.volunteerQuota ?? '',
      dateDebutPartenariat,
      dateFinPartenariat,
      e.vscCount ?? 0,
      formatExportDate(e.createdAt),
      e.establiCategory ?? '',
      e.priorityNetwork ?? '',
      e.isQpv === true ? 'Oui' : e.isQpv === false ? 'Non' : '',
      e.renewalNextYear === true ? 'Oui' : e.renewalNextYear === false ? 'Non' : '',
      e.ipsValue ?? '',
      e.ipsYear ?? '',
      e.conventionSigned === true ? 'Oui' : e.conventionSigned === false ? 'Non' : '',
      e.hasDevoirsFaits === true ? 'Oui' : e.hasDevoirsFaits === false ? 'Non' : '',
      e.hasInternat === true ? 'Oui' : e.hasInternat === false ? 'Non' : '',
      e.involvementLevel ?? '',
      PARTNER_RELATIONSHIP_QUALITY_LABELS[e.partnerRelationshipQuality ?? ''] ?? e.partnerRelationshipQuality ?? '',
    ];
  }

  private async buildEstablishmentExportBaseQuery(
    companyId: string,
    filters?: {
      types?: EstablishmentType[];
      statuses?: EstablishmentStatus[];
      coordinatorId?: string;
      managedById?: string;
      categories?: EstablishmentCategory[];
      priorityNetworks?: EstablishmentPriorityNetwork[];
      isQpv?: boolean | null;
    },
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<SelectQueryBuilder<Establishment> | null> {
    const qb = this.establishmentRepository
      .createQueryBuilder('establishment')
      .where('establishment.company_id = :companyId', { companyId });

    if (visibilityScope) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'establishments',
        { userId: userId!, companyId },
      );
    } else {
      // legacy fallback — conserver jusqu'à migration complète des controllers
      const scopedEstablishmentIds = await this.getUserScopedEstablishmentIds(companyId, userId, roleCodes);
      if (scopedEstablishmentIds) {
        if (scopedEstablishmentIds.length === 0) {
          return null;
        }
        qb.andWhere('establishment.id IN (:...scopedEstablishmentIds)', { scopedEstablishmentIds });
      }
    }

    if (filters?.types?.length) {
      qb.andWhere('establishment.type IN (:...types)', { types: filters.types });
    }
    if (filters?.statuses?.length) {
      qb.andWhere('establishment.status IN (:...statuses)', { statuses: filters.statuses });
    }
    if (filters?.coordinatorId) {
      qb.andWhere(
        'establishment.id IN (SELECT ec.establishment_id FROM establishment_coordinators ec WHERE ec.coordinator_id = :coordinatorId)',
        { coordinatorId: filters.coordinatorId },
      );
    }
    if (filters?.managedById) {
      qb.andWhere('establishment.managed_by_id = :managedById', { managedById: filters.managedById });
    }
    if (filters?.categories?.length) {
      qb.andWhere('establishment.establi_category IN (:...categories)', { categories: filters.categories });
    }
    if (filters?.priorityNetworks?.length) {
      qb.andWhere('establishment.priority_network IN (:...priorityNetworks)', { priorityNetworks: filters.priorityNetworks });
    }
    if (filters?.isQpv !== undefined && filters.isQpv !== null) {
      qb.andWhere('establishment.is_qpv = :isQpv', { isQpv: filters.isQpv });
    }

    qb.orderBy('establishment.created_at', 'DESC');
    return qb;
  }

  async searchEstablishments(
    companyId: string,
    query: string,
    page: number = 1,
    limit: number = 5,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
    department?: string,
  ): Promise<{ data: Establishment[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;
    // Alias must be "establishment" — visibility scope resolver emits establishment.id IN (...)
    const qb = this.establishmentRepository
      .createQueryBuilder('establishment')
      .loadRelationCountAndMap('establishment.roomsCount', 'establishment.rooms')
      .where('establishment.company_id = :companyId', { companyId })
      .andWhere('establishment.deleted_at IS NULL');

    if (visibilityScope) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'establishments',
        { userId: userId!, companyId },
      );
    } else {
      // legacy fallback — conserver jusqu'à migration complète des controllers
      const scopedEstablishmentIds = await this.getUserScopedEstablishmentIds(companyId, userId, roleCodes);
      if (scopedEstablishmentIds) {
        if (scopedEstablishmentIds.length === 0) {
          return { data: [], total: 0, hasMore: false };
        }
        qb.andWhere('establishment.id IN (:...scopedEstablishmentIds)', {
          scopedEstablishmentIds,
        });
      }
    }

    if (query && query.length >= 2) {
      qb.andWhere('UNACCENT(establishment.name) ILIKE UNACCENT(:query)', {
        query: `%${query}%`,
      });
    }

    if (department) {
      if (/^\d{2,3}$/.test(department)) {
        qb.andWhere('establishment.postal_code LIKE :deptPrefix', {
          deptPrefix: `${department}%`,
        });
      } else {
        qb.andWhere('UNACCENT(establishment.department) ILIKE UNACCENT(:deptName)', {
          deptName: `%${department}%`,
        });
      }
    }

    const [data, total] = await qb
      .orderBy('establishment.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    await this.attachVscCounts(companyId, data);
    await this.attachStudentCounts(companyId, data);

    return {
      data,
      total,
      hasMore: skip + data.length < total,
    };
  }

  async findOneEstablishment(
    companyId: string,
    establishmentId: string,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<
    Omit<Establishment, 'establishmentSpecialties'> & {
      coordinators?: User[];
      offeredSpecialties?: Specialty[];
    }
  > {
    if (visibilityScope) {
      const accessQb = this.establishmentRepository
        .createQueryBuilder('establishment')
        .select('establishment.id')
        .where('establishment.id = :establishmentId', { establishmentId })
        .andWhere('establishment.company_id = :companyId', { companyId });
      await this.visibilityScopeResolver.applyToQueryBuilder(
        accessQb,
        visibilityScope,
        'establishments',
        { userId: userId!, companyId },
      );
      const allowed = await accessQb.getOne();
      if (!allowed) {
        throw new NotFoundException(`Establishment ${establishmentId} not found`);
      }
    } else {
      const scopedEstablishmentIds = await this.getUserScopedEstablishmentIds(
        companyId,
        userId,
        roleCodes,
      );
      if (scopedEstablishmentIds && !scopedEstablishmentIds.includes(establishmentId)) {
        throw new NotFoundException(`Establishment ${establishmentId} not found`);
      }
    }

    const establishment = await this.establishmentRepository
      .createQueryBuilder('establishment')
      .leftJoinAndSelect('establishment.managedBy', 'managedBy')
      .leftJoinAndSelect('establishment.establishmentSpecialties', 'es')
      .leftJoinAndSelect('es.specialty', 'offeredSpec')
      .loadRelationCountAndMap('establishment.roomsCount', 'establishment.rooms')
      .where('establishment.id = :establishmentId', { establishmentId })
      .andWhere('establishment.company_id = :companyId', { companyId })
      .getOne();
      
    if (!establishment) {
      throw new NotFoundException(
        `Establishment ${establishmentId} not found`,
      );
    }
    
    await this.attachVscCounts(companyId, [establishment]);
    await this.attachStudentCounts(companyId, [establishment]);

    const coordinators = await this.getEstablishmentCoordinators(establishmentId);
    const establishmentSpecialties = establishment.establishmentSpecialties ?? [];
    const offeredSpecialties = establishmentSpecialties
      .map((row) => row.specialty)
      .filter((s): s is Specialty => Boolean(s));
    const { establishmentSpecialties: _es, ...estRest } = establishment;
    return { ...estRest, coordinators, offeredSpecialties };
  }

  async createEstablishment(
    companyId: string,
    dto: CreateEstablishmentDto,
    actorId?: string,
  ): Promise<Establishment> {
    await this.registerContactFunctions(companyId, dto.contacts);

    if (dto.classes && dto.classes.length > 0) {
      this.validateClassDtos(dto.classes);
    }

    if (dto.coordinatorIds?.length) {
      await this.assertCoordinatorsExist(companyId, dto.coordinatorIds);
    }

    const payload: DeepPartial<Establishment> = {
      companyId,
      uaiCode: dto.uaiCode?.trim() || null,
      name: dto.name,
      officialName: dto.officialName ?? null,
      type: (dto.type as EstablishmentType | undefined) ?? null,
      status: (dto.status ?? 'active') as EstablishmentStatus,
      addressLine1: dto.addressLine1 ?? null,
      postalCode: dto.postalCode ?? null,
      city: dto.city ?? null,
      country: dto.country ?? 'FR',
      timezone: dto.timezone ?? null,
      calendarType: (dto.calendarType as CalendarType | undefined) ?? null,
      contacts: this.normalizeContacts(dto.contacts),
      volunteerQuota: dto.volunteerQuota ?? null,
      govData: dto.govData ?? null,
      establiCategory: (dto.establiCategory as EstablishmentCategory | undefined) ?? null,
      priorityNetwork: (dto.priorityNetwork as EstablishmentPriorityNetwork | undefined) ?? null,
      isQpv: dto.isQpv ?? null,
      renewalNextYear: dto.renewalNextYear ?? null,
      hasDevoirsFaits: dto.hasDevoirsFaits ?? null,
      hasInternat: dto.hasInternat ?? null,
      involvementLevel: dto.involvementLevel ?? null,
      partnerRelationshipQuality: (dto.partnerRelationshipQuality as PartnerRelationshipQuality | undefined) ?? null,
      conventionSigned: dto.conventionSigned ?? null,
      engagementStartDate: dto.engagementStartDate ? new Date(dto.engagementStartDate) : null,
      engagementEndDate: dto.engagementEndDate ? new Date(dto.engagementEndDate) : null,
      managedById: dto.managedById ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      ipsValue: dto.ipsValue ?? null,
      ipsYear: dto.ipsYear ?? null,
      department: dto.department ?? null,
    };

    const saved = await this.dataSource.transaction(async (manager: EntityManager) => {
      const establishment = manager.create(Establishment, payload);
      const savedEstablishment = await manager.save(Establishment, establishment);

      if (dto.coordinatorIds && dto.coordinatorIds.length > 0) {
        const links = dto.coordinatorIds.map((coordinatorId) =>
          manager.create(EstablishmentCoordinator, {
            establishmentId: savedEstablishment.id,
            coordinatorId,
            companyId,
          }),
        );
        await manager.save(EstablishmentCoordinator, links);
      }

      if (dto.rooms && dto.rooms.length > 0) {
        const validRooms = dto.rooms.filter((r) => r.name?.trim());
        const rooms = validRooms.map((room) =>
          manager.create(Room, {
            establishmentId: savedEstablishment.id,
            companyId,
            name: room.name,
            label: room.label || null,
            capacity: room.capacity || null,
          }),
        );
        await manager.save(Room, rooms);
      }

      if (dto.classes && dto.classes.length > 0) {
        const schoolClasses = dto.classes.map((cls) =>
          manager.create(SchoolClass, {
            establishmentId: savedEstablishment.id,
            companyId,
            levelId: cls.levelId,
            schoolYearId: cls.schoolYearId,
            name: cls.name.trim(),
            studentCount: cls.studentCount ?? null,
          }),
        );
        await manager.save(SchoolClass, schoolClasses);
      }

      return savedEstablishment;
    }).catch((err: unknown) => {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new BadRequestException(
          'Une classe avec ce nom existe déjà dans cet établissement pour cette année scolaire.',
        );
      }
      throw err;
    });

    if (dto.offeredSpecialtyIds !== undefined) {
      await this.specialtiesService.replaceEstablishmentOffered(
        saved.id,
        saved.type,
        dto.offeredSpecialtyIds,
      );
    }

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'establishments',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async updateEstablishment(
    companyId: string,
    establishmentId: string,
    dto: UpdateEstablishmentDto,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<Establishment> {
    // Vérification d'accès si writeScope fourni
    if (writeScope && actorId) {
      const checkQb = this.establishmentRepository
        .createQueryBuilder('establishment')
        .where('establishment.id = :establishmentId', { establishmentId })
        .andWhere('establishment.company_id = :companyId', { companyId });
      
      await this.visibilityScopeResolver.applyToQueryBuilder(
        checkQb,
        writeScope,
        'establishments',
        { userId: actorId, companyId },
      );
      
      const canUpdate = await checkQb.getOne();
      if (!canUpdate) {
        throw new ForbiddenException(`Vous n'avez pas la permission de modifier cet établissement`);
      }
    }
    
    const establishment = await this.findOneEstablishment(companyId, establishmentId);
    const oldValue = { ...establishment } as unknown as Record<string, unknown>;

    if (dto.contacts !== undefined) {
      await this.registerContactFunctions(companyId, dto.contacts);
      establishment.contacts = this.normalizeContacts(dto.contacts);
    }

    Object.assign(establishment, dto);
    if ('uaiCode' in dto) {
      establishment.uaiCode = dto.uaiCode?.trim() || null;
    }
    if (dto.engagementStartDate !== undefined) {
      establishment.engagementStartDate = dto.engagementStartDate
        ? new Date(dto.engagementStartDate)
        : null;
    }
    if (dto.engagementEndDate !== undefined) {
      establishment.engagementEndDate = dto.engagementEndDate
        ? new Date(dto.engagementEndDate)
        : null;
    }
    if (dto.classes !== undefined && dto.classes.length > 0) {
      this.validateClassDtos(dto.classes);
    }

    const saved = await this.dataSource.transaction(async (manager: EntityManager) => {
      const { coordinators: _coord, offeredSpecialties: _off, ...entityToSave } = establishment;
      const savedEstablishment = await manager.save(Establishment, entityToSave as Establishment);

      if (dto.coordinatorIds !== undefined) {
        await this.replaceEstablishmentCoordinatorLinks(
          establishmentId,
          companyId,
          dto.coordinatorIds,
        );
      }

      if (dto.rooms !== undefined) {
        await this.syncEstablishmentRooms(establishmentId, companyId, dto.rooms);
      }

      if (dto.classes !== undefined) {
        // Toutes les classes ont déjà été validées avant la transaction
        const classesToProcess = dto.classes;

        // IDs soumis (classes existantes à conserver/mettre à jour)
        const submittedIds = new Set(
          classesToProcess
            .filter((c) => (c as { id?: string }).id)
            .map((c) => (c as { id?: string }).id!),
        );

        // Supprimer définitivement les classes retirées
        const existingClasses = await manager.find(SchoolClass, {
          where: { establishmentId, companyId },
        });
        const toDelete = existingClasses.filter((c) => !submittedIds.has(c.id));
        if (toDelete.length > 0) {
          await manager.delete(
            SchoolClass,
            toDelete.map((c) => c.id),
          );
        }

        // Créer ou mettre à jour
        for (const cls of classesToProcess) {
          const clsId = (cls as { id?: string }).id;
          const existing = existingClasses.find((c) => c.id === clsId);
          if (existing) {
            await manager.update(SchoolClass, existing.id, {
              levelId: cls.levelId,
              schoolYearId: cls.schoolYearId,
              name: cls.name.trim(),
              studentCount: cls.studentCount ?? null,
            });
          } else {
            await manager.save(
              SchoolClass,
              manager.create(SchoolClass, {
                establishmentId,
                companyId,
                levelId: cls.levelId,
                schoolYearId: cls.schoolYearId,
                name: cls.name.trim(),
                studentCount: cls.studentCount ?? null,
              }),
            );
          }
        }
      }

      return savedEstablishment;
    }).catch((err: unknown) => {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new BadRequestException(
          'Une classe avec ce nom existe déjà dans cet établissement pour cette année scolaire.',
        );
      }
      throw err;
    });

    if (dto.offeredSpecialtyIds !== undefined) {
      await this.specialtiesService.replaceEstablishmentOffered(
        establishmentId,
        saved.type,
        dto.offeredSpecialtyIds,
      );
    } else if (dto.type !== undefined && saved.type !== 'lycee') {
      // Le type a changé vers un type non-lycée : supprimer toutes les spécialités existantes
      await this.specialtiesService.replaceEstablishmentOffered(
        establishmentId,
        saved.type,
        [],
      );
    }

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'establishments',
      entityId: establishmentId,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeEstablishment(
    companyId: string,
    establishmentId: string,
    actorId?: string,
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    // Vérification d'accès si writeScope fourni
    if (writeScope && actorId) {
      const checkQb = this.establishmentRepository
        .createQueryBuilder('establishment')
        .where('establishment.id = :establishmentId', { establishmentId })
        .andWhere('establishment.company_id = :companyId', { companyId });
      
      await this.visibilityScopeResolver.applyToQueryBuilder(
        checkQb,
        writeScope,
        'establishments',
        { userId: actorId, companyId },
      );
      
      const canDelete = await checkQb.getOne();
      if (!canDelete) {
        throw new ForbiddenException(`Vous n'avez pas la permission de supprimer cet établissement`);
      }
    }
    
    const establishment = await this.findOneEstablishment(
      companyId,
      establishmentId,
    );
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'establishments',
      entityId: establishmentId,
      action: 'DELETE',
      oldValue: {
        id: establishment.id,
        uaiCode: establishment.uaiCode,
        name: establishment.name,
      } as Record<string, unknown>,
    });
    await this.establishmentRepository.softDelete(establishmentId);

    // Soft-delete toutes les classes liées (la FK physique ON DELETE CASCADE ne couvre pas le soft delete)
    await this.schoolClassRepository
      .createQueryBuilder()
      .softDelete()
      .where('establishment_id = :establishmentId AND company_id = :companyId AND deleted_at IS NULL', {
        establishmentId,
        companyId,
      })
      .execute();
  }

  async findRooms(companyId: string, establishmentId?: string): Promise<Room[]> {
    const where: any = { companyId };
    if (establishmentId) {
      where.establishmentId = establishmentId;
    }
    return this.roomRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOneRoom(companyId: string, roomId: string): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId, companyId },
    });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    return room;
  }

  async createRoom(
    companyId: string,
    dto: CreateRoomDto,
    actorId?: string,
  ): Promise<Room> {
    const establishment = await this.establishmentRepository.findOne({
      where: { id: dto.establishmentId, companyId },
    });
    if (!establishment) {
      throw new NotFoundException(
        `Establishment ${dto.establishmentId} not found or does not belong to this company`,
      );
    }
    const room = this.roomRepository.create({
      companyId,
      establishmentId: dto.establishmentId,
      name: dto.name,
      label: dto.label ?? null,
      capacity: dto.capacity ?? null,
      isAvailable: dto.isAvailable ?? true,
      availabilityRules: dto.availabilityRules ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.roomRepository.save(room);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rooms',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async updateRoom(
    companyId: string,
    roomId: string,
    dto: UpdateRoomDto,
    actorId?: string,
  ): Promise<Room> {
    const room = await this.findOneRoom(companyId, roomId);
    const oldValue = { ...room } as unknown as Record<string, unknown>;
    if (dto.establishmentId !== undefined) {
      const establishment = await this.establishmentRepository.findOne({
        where: { id: dto.establishmentId, companyId },
      });
      if (!establishment) {
        throw new NotFoundException(
          `Establishment ${dto.establishmentId} not found or does not belong to this company`,
        );
      }
    }
    Object.assign(room, dto);
    const saved = await this.roomRepository.save(room);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rooms',
      entityId: roomId,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeRoom(
    companyId: string,
    roomId: string,
    actorId?: string,
  ): Promise<void> {
    const room = await this.findOneRoom(companyId, roomId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'rooms',
      entityId: roomId,
      action: 'DELETE',
      oldValue: {
        id: room.id,
        name: room.name,
        establishmentId: room.establishmentId,
      } as Record<string, unknown>,
    });
    await this.roomRepository.softDelete(roomId);
  }

  /** Multi-institution manager dashboard: companies with aggregated counts (paginated). */
  async getManagerDashboard(
    page: number = 1,
    pageSize: number = 20,
    filters?: { status?: string; code?: string; q?: string },
  ): Promise<
    PaginatedResponse<{
      id: string;
      code: string;
      name: string;
      status: string;
      establishmentsCount: number;
      roomsCount: number;
      usersCount: number;
      sessionsCount: number;
    }>
  > {
    const { skip, take } = getSkipTake(page, pageSize);

    let qb = this.companyRepository
      .createQueryBuilder('company')
      .orderBy('company.created_at', 'DESC');

    if (filters?.status) {
      qb = qb.andWhere('company.status = :status', { status: filters.status });
    }
    if (filters?.code?.trim()) {
      qb = qb.andWhere('company.code ILIKE :code', {
        code: `%${filters.code.trim()}%`,
      });
    }
    if (filters?.q?.trim()) {
      const search = `%${filters.q.trim()}%`;
      qb = qb.andWhere('(company.name ILIKE :search OR company.code ILIKE :search)', {
        search,
      });
    }

    const [companies, total] = await qb.skip(skip).take(take).getManyAndCount();
    const data = await Promise.all(
      companies.map(async (c) => {
        const [establishmentsCount, roomsCount, usersCount, sessionsCount] =
          await Promise.all([
            this.establishmentRepository.count({ where: { companyId: c.id } }),
            this.roomRepository.count({ where: { companyId: c.id } }),
            this.userRepository.count({ where: { companyId: c.id } }),
            this.sessionRepository.count({ where: { companyId: c.id } }),
          ]);
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          status: c.status,
          establishmentsCount,
          roomsCount,
          usersCount,
          sessionsCount,
        };
      }),
    );
    return createPaginatedResponse(data, total, page, pageSize);
  }
}
