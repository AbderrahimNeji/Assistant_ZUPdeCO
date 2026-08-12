import * as admin from 'firebase-admin';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { User, type UserStatus } from './entities/user.entity';
import {
  formatStudentAccountStatusLabelFr,
  isStudentAccountStatus,
  statusMatchesRoleModel,
  type UserStatusChangeSource,
} from './user-status';
import { UserRole } from './entities/user-role.entity';
import { UserEstablishment } from './entities/user-establishment.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Role } from '../roles/entities/role.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { SessionStudentTutorPair } from '../sessions/entities/session-student-tutor-pair.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { BinomeCoeur } from '../sessions/entities/binome-coeur.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Subject } from '../academic/entities/subject.entity';
import { UserProfileSpecialty } from '../specialties/entities/user-profile-specialty.entity';
import { EstablishmentSpecialty } from '../specialties/entities/establishment-specialty.entity';
import { Specialty } from '../specialties/entities/specialty.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ImportUsersCsvQueryDto } from './dto/import-users-csv-query.dto';
import {
  parseLocalDate,
  parseLocalDateEndOfDay,
  computeRemainingCalendarMonthsUntilDate,
} from '../../common/utils/date-parser.utils';
import { formatExportDate, formatProfileGenderForExport } from '../../common/utils/format.utils';
import { buildXlsxBuffer } from '../../common/utils/excel-export.util';
import { ImportUsersCsvResultDto, ImportUsersCsvErrorDto } from './dto/import-users-csv-result.dto';
import { AuditLogService } from '../audit/audit.service';
import { StudentStatusHistoryService } from '../student-status-history/student-status-history.service';
import { StudentStatusHistory } from '../student-status-history/entities/student-status-history.entity';
import { createPaginatedResponse } from '../../common/dto/paginated-response';
import { getSkipTake } from '../../common/dto/pagination.dto';
import type { PaginatedResponse } from '../../common/dto/paginated-response';
import { InterfaceElement } from '../interface-elements/entities/interface-element.entity';
import { RoleInterfaceElement } from '../interface-elements/entities/role-interface-element.entity';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import { normalizeVisibilityScope } from '../../common/visibility/normalize-visibility-scope';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';
import type { EntityType } from '../../common/visibility/entity-relation-registry';
import { inferRoleGroupFromRoleCode } from '../roles/role-groups';
import { appendUserProfileSubjectJsonbFilter, resolveSubjectNames } from './subjects.utils';


interface CsvStudentRow {
  firebaseUid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  photoUrl?: string;
  status?: UserStatus;
  roleIds?: string;
  profileId?: string;
  codeEstablishment?: string;
  isMinor?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserEstablishment)
    private readonly userEstablishmentRepository: Repository<UserEstablishment>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
    @InjectRepository(SessionStudentTutorPair)
    private readonly sessionStudentTutorPairRepository: Repository<SessionStudentTutorPair>,
    @InjectRepository(SessionParticipant)
    private readonly sessionParticipantRepository: Repository<SessionParticipant>,
    @InjectRepository(BinomeCoeur)
    private readonly binomeCoeurRepository: Repository<BinomeCoeur>,
    @InjectRepository(SchoolClass)
    private readonly schoolClassRepository: Repository<SchoolClass>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(UserProfileSpecialty)
    private readonly userProfileSpecialtyRepository: Repository<UserProfileSpecialty>,
    @InjectRepository(EstablishmentSpecialty)
    private readonly establishmentSpecialtyRepository: Repository<EstablishmentSpecialty>,
    @InjectRepository(Specialty)
    private readonly specialtyRepository: Repository<Specialty>,
    @InjectRepository(InterfaceElement)
    private readonly elementsRepository: Repository<InterfaceElement>,
    @InjectRepository(RoleInterfaceElement)
    private readonly roleInterfaceElementsRepository: Repository<RoleInterfaceElement>,
    @InjectRepository(StudentStatusHistory)
    private readonly studentStatusHistoryRepository: Repository<StudentStatusHistory>,
    private readonly auditLogService: AuditLogService,
    private readonly studentStatusHistoryService: StudentStatusHistoryService,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
    private readonly configService: ConfigService,
  ) {}

  /** Min présences séances pour accompanied à la réactivation (aligné env). */
  getAccompaniedMinPresentSessions(): number {
    const v = this.configService.get<number>('STUDENT_ACCOMPANIED_MIN_PRESENT_SESSIONS');
    return typeof v === 'number' && Number.isFinite(v) && v >= 1 ? Math.floor(v) : 3;
  }

  studentReactivationTargetFromPresentCount(count: number): 'accompanied' | 'registered' {
    return count >= this.getAccompaniedMinPresentSessions() ? 'accompanied' : 'registered';
  }

  /**
   * Historique des changements de statut élève (table `student_status_history`), après vérif entreprise + rôle élève.
   */
  async getStudentStatusHistory(userId: string, companyId: string) {
    await this.findOne(userId, companyId);
    if (!(await this.userHasStudentRole(userId, companyId))) {
      throw new BadRequestException('Status history is only available for student accounts');
    }
    return this.studentStatusHistoryService.findByStudentUserId(userId);
  }

  /** Retourne le dernier motif de désactivation d'un élève (null si aucun). */
  async getLatestDeactivationReason(userId: string): Promise<string | null> {
    const entry = await this.getLatestDeactivationEntry(userId);
    return entry?.reason ?? null;
  }

  /** Retourne la dernière entrée de désactivation (motif + précision). */
  async getLatestDeactivationEntry(userId: string): Promise<StudentStatusHistory | null> {
    return this.studentStatusHistoryRepository.findOne({
      where: { studentUserId: userId, newStatus: 'deactivated' },
      order: { createdAt: 'DESC' },
    });
  }

  /** Persiste une transition de statut élève dans `student_status_history` uniquement. */
  private async recordStudentStatusChangeDual(
    companyId: string,
    studentUserId: string,
    actorId: string | null,
    oldStatus: UserStatus,
    newStatus: UserStatus,
    _source: UserStatusChangeSource,
    reason?: string | null,
    reasonNote?: string | null,
  ): Promise<void> {
    if (!isStudentAccountStatus(oldStatus) || !isStudentAccountStatus(newStatus)) {
      return;
    }
    await this.studentStatusHistoryService.record({
      studentUserId,
      updatedByUserId: actorId,
      oldStatus,
      newStatus,
      reason,
      reasonNote,
    });
  }

  /**
   * Enregistre une transition entre deux statuts élève dans `student_status_history`.
   * No-op si les statuts ne sont pas tous deux du modèle élève ou si inchangé.
   */
  async recordStudentAccountStatusChange(
    companyId: string,
    studentUserId: string,
    actorUserId: string | null | undefined,
    oldStatus: UserStatus,
    newStatus: UserStatus,
    source: UserStatusChangeSource,
  ): Promise<void> {
    if (oldStatus === newStatus) return;
    await this.recordStudentStatusChangeDual(
      companyId,
      studentUserId,
      actorUserId ?? null,
      oldStatus,
      newStatus,
      source,
    );
  }

  private static parseTimeToMinutes(time: string): number {
    const [h, m] = String(time ?? '')
      .trim()
      .split(':')
      .map((v) => parseInt(v, 10) || 0);
    return h * 60 + m;
  }

  private async assertSchoolClassAssignable(
    companyId: string,
    userId: string,
    schoolClassId: string | null | undefined,
  ): Promise<void> {
    if (schoolClassId === undefined || schoolClassId === null) return;
    const sc = await this.schoolClassRepository.findOne({
      where: { id: schoolClassId, companyId },
    });
    if (!sc) {
      throw new BadRequestException('School class not found for this company');
    }
    const links = await this.userEstablishmentRepository.find({ where: { userId, companyId } });
    const estIds = links.map((l) => l.establishmentId);
    if (!estIds.includes(sc.establishmentId)) {
      throw new BadRequestException(
        'School class must belong to an establishment assigned to this user',
      );
    }
  }

  private convertAvailabilityToFilter(
    dayOfWeek: number,
    startTime: string,
    endTime: string,
  ): Promise<{ dayOfWeek: number; startMinutes: number; endMinutes: number }> {
    const startMinutesLocal = UsersService.parseTimeToMinutes(startTime);
    const endMinutesLocal = UsersService.parseTimeToMinutes(endTime);
    if (startMinutesLocal >= endMinutesLocal) {
      throw new BadRequestException('availabilityStartTime must be earlier than availabilityEndTime');
    }

    return Promise.resolve({
      dayOfWeek,
      startMinutes: startMinutesLocal,
      endMinutes: endMinutesLocal,
    });
  }

  /**
   * Validates establishment ids belong to the company (at least one).
   * Exposed for invitation flow and other modules that create users outside create().
   */
  async validateUserAssignments(
    companyId: string,
    establishmentIds: string[] | undefined,
    managedById?: string | null,
    selfUserId?: string,
  ): Promise<void> {
    if (establishmentIds !== undefined) {
      await this.assertEstablishmentsBelongToCompany(companyId, establishmentIds);
    }
    await this.assertManagedByValid(companyId, managedById, selfUserId);
  }

  /**
   * Assert that the actor has access to a user entity based on the write scope.
   * Dynamically re-resolves the visibility scope with the correct interface based on target user's role.
   * Throws ForbiddenException if access is denied.
   */
  private async assertUserAccess(
    userId: string,
    companyId: string,
    actorId: string,
    actorRoles: string[],
    actionId: string, // e.g. 'action-edit-row'
    genericScope?: VisibilityScope | null, // The scope resolved by @WriteScope with 'users' interface (fallback)
  ): Promise<void> {
    // 1. Load target user with roles to determine correct interface
    const targetUser = await this.userRepository.findOne({
      where: { id: userId, companyId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!targetUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // 2. Determine interface and entityType based on target user's role
    let interfaceName = 'users'; // Fallback
    let entityType: EntityType = 'users';
    
    if (targetUser.userRoles?.length) {
      const primaryRole = targetUser.userRoles[0]?.role;
      if (primaryRole) {
        const roleGroup = primaryRole.roleGroup || inferRoleGroupFromRoleCode(primaryRole.code);
        // Map role group to interface name AND entity type
        const roleGroupMapping: Record<string, { interface: string; entity: EntityType }> = {
          'students': { interface: 'students', entity: 'students' },
          'tutors': { interface: 'tutors', entity: 'tutors' },
          'volunteers': { interface: 'volunteers', entity: 'volunteers' },
          'admins': { interface: 'admins', entity: 'admins' },
        };
        const mapping = roleGroupMapping[roleGroup];
        if (mapping) {
          interfaceName = mapping.interface;
          entityType = mapping.entity;
        }
      }
    }

    // 3. Re-resolve the visibility scope with the CORRECT interface
    let effectiveScope: VisibilityScope | null = genericScope ?? null;
    
    // Only re-resolve if we have a different interface than 'users'
    if (interfaceName !== 'users' && actorRoles?.length) {
      const roleCodesLc = actorRoles.map((c) => (c ?? '').toLowerCase());
      
      // Query role_interface_elements for the specific interface
      const rie = await this.roleInterfaceElementsRepository
        .createQueryBuilder('rie')
        .innerJoin('rie.interfaceElement', 'ie')
        .innerJoin('rie.role', 'r')
        .select('rie.visibility_scope', 'visibilityScope')
        .where('ie.element_id = :elementId', { elementId: actionId })
        .andWhere('ie.interface_name = :interfaceName', { interfaceName })
        .andWhere('ie.element_type = :elementType', { elementType: 'action' })
        .andWhere('ie.deleted_at IS NULL')
        .andWhere('LOWER(r.code) IN (:...roleCodesLc)', { roleCodesLc })
        .andWhere('r.company_id = :companyId', { companyId })
        .andWhere('r.deleted_at IS NULL')
        .andWhere('rie.company_id = :companyId', { companyId })
        .orderBy('COALESCE(r.hierarchy_level, 2147483647)', 'ASC')
        .addOrderBy('r.code', 'ASC')
        .getRawOne<{ visibilityScope: VisibilityScope | null }>();

      effectiveScope = rie?.visibilityScope ?? null;
    }

    // 4. Check access with the re-resolved scope and correct entity type
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .andWhere('user.company_id = :companyId', { companyId });

    if (effectiveScope !== undefined && effectiveScope !== null) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        effectiveScope,
        entityType,
        { userId: actorId, companyId },
      );
    }

    const accessibleUser = await qb.getOne();
    if (!accessibleUser) {
      throw new ForbiddenException(`You do not have access to this ${interfaceName.replace(/s$/, '')}`);
    }
  }

  /**
   * Replace all user_establishments rows for this user (caller must validate ids first).
   */
  async replaceUserEstablishmentLinks(
    userId: string,
    companyId: string,
    establishmentIds: string[],
  ): Promise<void> {
    await this.userEstablishmentRepository.delete({ userId, companyId });
    if (!establishmentIds.length) return;
    const links = establishmentIds.map((establishmentId) =>
      this.userEstablishmentRepository.create({ userId, companyId, establishmentId }),
    );
    await this.userEstablishmentRepository.save(links);
  }

  /**
   * Replace all user_roles for this user. Persists roles.label into user_roles.role_label.
   */
  private async replaceUserRoles(userId: string, companyId: string, roleIds: string[]): Promise<void> {
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds), companyId },
    });
    if (roles.length !== roleIds.length) {
      throw new ConflictException(
        'One or more role IDs do not exist or do not belong to this company',
      );
    }
    const roleById = new Map(roles.map((r) => [r.id, r]));
    await this.userRoleRepository.delete({ userId });
    for (const roleId of roleIds) {
      const role = roleById.get(roleId);
      if (!role) {
        throw new ConflictException(
          'One or more role IDs do not exist or do not belong to this company',
        );
      }
      await this.userRoleRepository.save(
        this.userRoleRepository.create({
          userId,
          roleId: role.id,
          roleLabel: role.label,
        }),
      );
    }
  }

  private async assertEstablishmentsBelongToCompany(
    companyId: string,
    establishmentIds: string[],
  ): Promise<void> {
    const unique = [...new Set(establishmentIds)];
    if (!unique.length) {
      throw new BadRequestException('At least one establishment is required');
    }
    const establishments = await this.establishmentRepository.find({
      where: { id: In(unique), companyId },
    });
    if (establishments.length !== unique.length) {
      throw new BadRequestException(
        'One or more establishments do not exist or do not belong to this company',
      );
    }
  }

  private async assertManagedByValid(
    companyId: string,
    managedById: string | null | undefined,
    selfUserId?: string,
  ): Promise<void> {
    if (managedById === undefined || managedById === null) return;
    if (selfUserId && managedById === selfUserId) {
      throw new BadRequestException('managedById cannot reference the same user');
    }
    const manager = await this.userRepository.findOne({ 
      where: { id: managedById, companyId },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!manager) {
      throw new BadRequestException('managedById does not refer to a user in this company');
    }
    
    const allowedManagedByCodes = new Set(['manager', 'coordinator']);
    const hasAllowedRole = manager.userRoles?.some((ur) =>
      ur.role?.code && allowedManagedByCodes.has(ur.role.code),
    );
    if (!hasAllowedRole) {
      throw new BadRequestException(
        'managedById must reference a user with the manager or coordinator role',
      );
    }
  }

  /**
   * Calculate if a user is a minor based on their date of birth.
   * A minor is someone under 18 years old.
   */
  private calculateIsMinor(dateOfBirth: string | null | undefined): boolean {
    if (!dateOfBirth) return false;
    
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age < 18;
  }

  /**
   * Check if a user has the STUDENT role
   */
  async userHasStudentRole(userId: string, _companyId: string): Promise<boolean> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });
    
    return userRoles.some(ur => ur.role?.code?.toUpperCase() === 'STUDENT');
  }

  private async userWillHaveStudentRole(companyId: string, roleIds?: string[]): Promise<boolean> {
    if (!roleIds?.length) return false;
    const roles = await this.roleRepository.find({ where: { id: In(roleIds), companyId } });
    return roles.some((r) => r.code?.toUpperCase() === 'STUDENT');
  }

  private async userWillHaveCoordinatorRole(companyId: string, roleIds?: string[]): Promise<boolean> {
    if (!roleIds?.length) return false;
    const roles = await this.roleRepository.find({ where: { id: In(roleIds), companyId } });
    return roles.some((r) => r.code?.toUpperCase() === 'COORDINATOR');
  }

  private async userWillHaveTutorRole(companyId: string, roleIds?: string[]): Promise<boolean> {
    if (!roleIds?.length) return false;
    const roles = await this.roleRepository.find({ where: { id: In(roleIds), companyId } });
    return roles.some((r) => r.roleGroup === 'tutors');
  }

  private async userHasTutorRole(userId: string): Promise<boolean> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });
    return userRoles.some((ur) => ur.role?.roleGroup === 'tutors');
  }

  /** Statut initial après intention de rôles (élève → registered, sinon → active). */
  async resolveInitialStatusForRoles(companyId: string, roleIds?: string[]): Promise<UserStatus> {
    return (await this.userWillHaveStudentRole(companyId, roleIds)) ? 'registered' : 'active';
  }

  /** Après changement de rôles : registered/accompanied/deactivated si élève, sinon active/deactivated. */
  private async coerceUserStatusAfterRoleChange(userId: string, companyId: string): Promise<void> {
    const row = await this.userRepository.findOne({ where: { id: userId, companyId } });
    if (!row) return;
    const hasStudent = await this.userHasStudentRole(userId, companyId);
    if (statusMatchesRoleModel(hasStudent, row.status)) return;
    row.status = hasStudent ? 'registered' : 'active';
    await this.userRepository.save(row);
  }

  private async replaceUserProfileSpecialtyLinks(
    userProfileId: string,
    specialtyIds: string[],
  ): Promise<void> {
    await this.userProfileSpecialtyRepository.delete({ userProfileId });
    if (!specialtyIds.length) return;
    const rows = specialtyIds.map((specialtyId) =>
      this.userProfileSpecialtyRepository.create({ userProfileId, specialtyId }),
    );
    await this.userProfileSpecialtyRepository.save(rows);
  }

  private async assertStudentSpecialtyIdsAllowed(
    companyId: string,
    userId: string,
    specialtyIds: string[],
    previousSpecialtyIds: string[],
  ): Promise<void> {
    if (!specialtyIds.length) return;
    const found = await this.specialtyRepository.find({ where: { id: In(specialtyIds) } });
    if (found.length !== specialtyIds.length) {
      throw new BadRequestException('One or more specialty IDs are invalid');
    }
    const ues = await this.userEstablishmentRepository.find({
      where: { userId, companyId },
      relations: ['establishment'],
    });
    const lyceeIds = ues
      .filter((ue) => ue.establishment?.type === 'lycee')
      .map((ue) => ue.establishmentId);
    if (!lyceeIds.length) {
      throw new BadRequestException('Student must be linked to a lycée to choose specialties');
    }
    const offered = await this.establishmentSpecialtyRepository.find({
      where: { establishmentId: In(lyceeIds) },
    });
    const allowed = new Set(offered.map((o) => o.specialtyId));
    const prev = new Set(previousSpecialtyIds);
    for (const sid of specialtyIds) {
      if (allowed.has(sid)) continue;
      if (prev.has(sid)) continue;
      throw new BadRequestException(
        'Each specialty must be offered by the student lycée, unless already assigned to this profile',
      );
    }
  }

  async create(
    companyId: string,
    dto: CreateUserDto,
    actorId?: string,
  ): Promise<User> {
    const establishmentIds = dto.establishmentIds ?? [];

    // Generate firebaseUid if not provided
    const firebaseUid = dto.firebaseUid || this.generateFirebaseUid(companyId);
    
    const existingByFirebase = await this.userRepository.findOne({
      where: { firebaseUid },
    });
    if (existingByFirebase) {
      throw new ConflictException(
        `User with firebase_uid "${firebaseUid}" already exists`,
      );
    }
    if (dto.email) {
      const existingByEmail = await this.userRepository.findOne({
        where: { companyId, email: dto.email },
      });
      if (existingByEmail) {
        throw new ConflictException(
          `User with email "${dto.email}" already exists in this company`,
        );
      }
    }

    await this.validateUserAssignments(companyId, dto.establishmentIds, dto.managedById);

    if (await this.userWillHaveTutorRole(companyId, dto.roleIds)) {
      if (dto.professionalSituation == null) {
        throw new BadRequestException('professionalSituation is required for tutors group');
      }
    }

    const user = this.userRepository.create({
      companyId,
      firebaseUid,
      email: dto.email ?? null,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      displayName: dto.displayName ?? null,
      phone: dto.phone ?? null,
      emailVerified: false,
      status: await this.resolveInitialStatusForRoles(companyId, dto.roleIds),
      managedById: dto.managedById ?? null,
    });
    const saved = await this.userRepository.save(user);

    await this.replaceUserEstablishmentLinks(saved.id, companyId, establishmentIds);

    if (dto.roleIds?.length) {
      await this.replaceUserRoles(saved.id, companyId, dto.roleIds);
    }

    if (
      (await this.userHasStudentRole(saved.id, companyId)) &&
      isStudentAccountStatus(saved.status)
    ) {
      await this.studentStatusHistoryService.record({
        studentUserId: saved.id,
        updatedByUserId: actorId ?? null,
        oldStatus: null,
        newStatus: saved.status,
      });
    }

    if (dto.schoolClassId) {
      await this.assertSchoolClassAssignable(companyId, saved.id, dto.schoolClassId);
    }

    // Create UserProfile if any profile fields are provided
    if (
      dto.subjects ||
      dto.availability ||
      dto.hasSpecialNeeds !== undefined ||
      dto.guardianContact ||
      dto.dateOfBirth ||
      dto.gender ||
      dto.levelId ||
      dto.medicalNotes ||
      dto.schoolClassId ||
      dto.engagementStartDate ||
      dto.engagementEndDate ||
      dto.professionalSituation != null ||
      dto.addressLine1 ||
      dto.department ||
      dto.postalCode ||
      dto.city ||
      dto.country ||
      (dto.specialtyIds !== undefined && dto.specialtyIds.length > 0)
    ) {
      // Calculate isMinor automatically based on dateOfBirth
      const isMinor = this.calculateIsMinor(dto.dateOfBirth);
      
      // Resolve subject names from subject IDs
      const subjectNames = await resolveSubjectNames(dto.subjects, this.subjectRepository);
      
      const userProfile = this.userProfileRepository.create({
        userId: saved.id,
        profileId: null,
        profileLabel: null,
        subjects: dto.subjects || [],
        subjectNames,
        availability: dto.availability || null,
        isMinor,
        hasSpecialNeeds: dto.hasSpecialNeeds || false,
        specialNeedsType: (dto as any).specialNeedsType || null,
        specialNeedsNote: (dto as any).specialNeedsNote || null,
        isDisabled: (dto as any).isDisabled || false,
        disabilityTypes: (dto as any).disabilityTypes?.length > 0 ? (dto as any).disabilityTypes : null,
        disabilityOtherNote: (dto as any).disabilityOtherNote || null,
        guardianContact: dto.guardianContact || null,
        dateOfBirth: dto.dateOfBirth || null,
        gender: dto.gender || null,
        levelId: dto.levelId || null,
        medicalNotes: dto.medicalNotes || null,
        addressLine1: dto.addressLine1?.trim() ? dto.addressLine1.trim() : null,
        department: dto.department?.trim() ? dto.department.trim() : null,
        postalCode: dto.postalCode?.trim() ? dto.postalCode.trim() : null,
        city: dto.city?.trim() ? dto.city.trim() : null,
        country:
          dto.country != null && String(dto.country).trim()
            ? String(dto.country).trim().toUpperCase().slice(0, 2)
            : 'FR',
        schoolClassId: dto.schoolClassId ?? null,
        engagementStartDate: dto.engagementStartDate
          ? new Date(dto.engagementStartDate)
          : null,
        engagementEndDate: dto.engagementEndDate ? new Date(dto.engagementEndDate) : null,
        professionalSituation: dto.professionalSituation ?? null,
      });
      await this.userProfileRepository.save(userProfile);
    }

    if (dto.specialtyIds !== undefined && dto.specialtyIds.length > 0) {
      const hasStudent = await this.userWillHaveStudentRole(companyId, dto.roleIds);
      if (!hasStudent) {
        throw new BadRequestException('Specialties can only be set for users with the student role');
      }
      const profile = await this.userProfileRepository.findOne({ where: { userId: saved.id } });
      if (!profile) {
        throw new BadRequestException('User profile is required to set specialties');
      }
      await this.assertStudentSpecialtyIdsAllowed(companyId, saved.id, dto.specialtyIds, []);
      await this.replaceUserProfileSpecialtyLinks(profile.id, dto.specialtyIds);
    }

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'users',
      entityId: saved.id,
      action: 'CREATE',
      newValue: {
        firebaseUid,
        email: dto.email,
        roleIds: dto.roleIds,
        establishmentIds,
        managedById: dto.managedById,
      } as unknown as Record<string, unknown>,
    });

    return this.findOne(saved.id, companyId);
  }

  async bulkCreate(
    companyId: string,
    dtos: CreateUserDto[],
    actorId?: string,
  ): Promise<User[]> {
    const result: User[] = [];
    for (const dto of dtos) {
      const user = await this.create(companyId, dto, actorId);
      result.push(user);
    }
    return result;
  }

  async importUsersFromCsv(
    companyId: string,
    file: Express.Multer.File,
    actorId?: string,
    options?: ImportUsersCsvQueryDto,
  ): Promise<ImportUsersCsvResultDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    const csvText = file.buffer.toString('utf-8');
    if (!csvText.trim()) {
      throw new BadRequestException('CSV file is empty');
    }

    const requiredColumns = ['firstName', 'lastName', 'email', 'codeEstablishment'];
    const rows = this.parseCsvRows(csvText, requiredColumns);
    const firstRow = rows[0] ?? {};
    const firstHeaders = Object.keys(firstRow);
    const missingHeaders = requiredColumns.filter((h) => !firstHeaders.includes(h));
    if (rows.length > 0 && missingHeaders.length > 0) {
      throw new BadRequestException(`Missing required CSV columns: ${missingHeaders.join(', ')}`);
    }

    const result: ImportUsersCsvResultDto = {
      totalRows: rows.length,
      importedCount: 0,
      skippedExistingEmailCount: 0,
      invalidCount: 0,
      errors: [],
    };

    const studentRole = await this.findStudentRole(companyId, options?.defaultRoleId);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;
      const email = (row.email ?? '').trim().toLowerCase();
      const firstName = (row.firstName ?? '').trim();
      const lastName = (row.lastName ?? '').trim();

      if (!email || !firstName || !lastName) {
        this.addImportError(result, rowNumber, email || undefined, 'MISSING_REQUIRED_FIELD', row);
        continue;
      }

      if (!this.isValidEmail(email)) {
        this.addImportError(result, rowNumber, email, 'INVALID_EMAIL', row);
        continue;
      }

      const profileId = (row.profileId ?? options?.defaultProfileId ?? '').trim();
      if (profileId && !this.isValidUuid(profileId)) {
        this.addImportError(result, rowNumber, email, 'INVALID_UUID_PROFILE_ID', row);
        continue;
      }

      const codeEstablishment = (row.codeEstablishment ?? '').trim();
      if (!codeEstablishment) {
        this.addImportError(result, rowNumber, email, 'MISSING_ESTABLISHMENT', row);
        continue;
      }

      const establishment = await this.establishmentRepository
        .createQueryBuilder('establishment')
        .select('establishment.id', 'id')
        .where('establishment.company_id = :companyId', { companyId })
        .andWhere('UPPER(establishment.uai_code) = :uaiCode', {
          uaiCode: codeEstablishment.toUpperCase(),
        })
        .getRawOne<{ id: string }>();
      if (!establishment) {
        this.addImportError(result, rowNumber, email, 'ESTABLISHMENT_CODE_NOT_FOUND', row);
        continue;
      }

      const roleIds = this.parseRoleIds(row.roleIds, options?.defaultRoleId, studentRole?.id);
      if (!roleIds.length) {
        this.addImportError(result, rowNumber, email, 'ROLE_NOT_FOUND', row);
        continue;
      }

      const existingByEmail = await this.userRepository.findOne({
        where: { companyId, email },
      });
      if (existingByEmail) {
        result.skippedExistingEmailCount += 1;
        continue;
      }

      try {
        const dto: CreateUserDto = {
          firebaseUid: (row.firebaseUid ?? '').trim() || this.generateImportFirebaseUid(companyId, rowNumber),
          email,
          firstName,
          lastName,
          displayName: (row.displayName ?? '').trim() || undefined,
          phone: (row.phone ?? '').trim() || undefined,
          roleIds,
          establishmentIds: [establishment.id],
        };

        if (!options?.dryRun) {
          const createdUser = await this.create(companyId, dto, actorId);
          await this.applyCsvOptionalFields(createdUser.id, companyId, row, profileId, actorId);
        }

        result.importedCount += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'UNKNOWN_IMPORT_ERROR';
        this.addImportError(result, rowNumber, email, reason, row);
      }
    }

    return result;
  }

  private async applyCsvOptionalFields(
    userId: string,
    companyId: string,
    row: CsvStudentRow,
    profileId: string,
    actorUserId?: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId, companyId } });
    if (!user) return;

    const previousStatus = user.status;
    const photoUrl = (row.photoUrl ?? '').trim();
    const status = (row.status ?? '').trim();
    if (photoUrl) user.photoUrl = photoUrl;
    if (isStudentAccountStatus(status)) user.status = status;
    if (photoUrl || status) await this.userRepository.save(user);

    if (
      actorUserId &&
      previousStatus !== user.status &&
      (await this.userHasStudentRole(userId, companyId)) &&
      isStudentAccountStatus(previousStatus) &&
      isStudentAccountStatus(user.status)
    ) {
      const actorRow = await this.userRepository.findOne({ where: { id: actorUserId } });
      await this.recordStudentStatusChangeDual(
        companyId,
        userId,
        actorRow?.id ?? null,
        previousStatus,
        user.status,
        'csv_import',
      );
    }

    if (profileId) {
      const profile = await this.profileRepository.findOne({ where: { id: profileId, companyId } });
      if (profile) {
        // Calculate isMinor automatically (CSV value is ignored)
        const isMinor = false;
        const userProfile = this.userProfileRepository.create({
          userId,
          profileId,
          profileLabel: profile.label,
          isMinor,
        });
        await this.userProfileRepository.save(userProfile);
      }
    }

  }

  private parseRoleIds(roleIdsRaw: string | undefined, defaultRoleId?: string, fallbackRoleId?: string): string[] {
    const fromRow = (roleIdsRaw ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => this.isValidUuid(id));
    if (fromRow.length) return fromRow;
    if (defaultRoleId && this.isValidUuid(defaultRoleId)) return [defaultRoleId];
    if (fallbackRoleId && this.isValidUuid(fallbackRoleId)) return [fallbackRoleId];
    return [];
  }

  private async findStudentRole(companyId: string, explicitRoleId?: string): Promise<Role | null> {
    if (explicitRoleId && this.isValidUuid(explicitRoleId)) {
      const explicit = await this.roleRepository.findOne({ where: { id: explicitRoleId, companyId } });
      if (explicit) return explicit;
    }
    return this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('UPPER(role.code) = :code', { code: 'STUDENT' })
      .getOne();
  }

  private addImportError(
    result: ImportUsersCsvResultDto,
    rowNumber: number,
    email: string | undefined,
    reason: string,
    rawRow: CsvStudentRow,
  ): void {
    result.invalidCount += 1;
    const err: ImportUsersCsvErrorDto = {
      rowNumber,
      reason,
      email,
      rawRow: rawRow as unknown as Record<string, string>,
    };
    result.errors.push(err);
  }

  private parseBoolean(value: string | undefined): boolean {
    const v = (value ?? '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'oui'].includes(v);
  }

  private parseCsvRows(csvText: string, requiredColumns: string[]): CsvStudentRow[] {
    const parseWithDelimiter = (delimiter: ',' | ';'): CsvStudentRow[] => {
      const parsedRows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
        delimiter,
      }) as Record<string, string>[];
      return parsedRows.map((row) => this.normalizeCsvRowKeys(row));
    };

    const commaRows = parseWithDelimiter(',');
    const commaHeaders = Object.keys(commaRows[0] ?? {});
    const commaMissingHeaders = requiredColumns.filter((h) => !commaHeaders.includes(h));
    if (!commaRows.length || commaMissingHeaders.length === 0) {
      return commaRows;
    }

    const semicolonRows = parseWithDelimiter(';');
    const semicolonHeaders = Object.keys(semicolonRows[0] ?? {});
    const semicolonMissingHeaders = requiredColumns.filter((h) => !semicolonHeaders.includes(h));
    if (!semicolonRows.length || semicolonMissingHeaders.length === 0) {
      return semicolonRows;
    }

    return commaRows;
  }

  private normalizeCsvRowKeys(row: Record<string, string>): CsvStudentRow {
    const normalized: Record<string, string> = {};
    for (const [rawKey, value] of Object.entries(row)) {
      const key = this.normalizeCsvHeader(rawKey);
      normalized[key] = value;
    }
    return normalized as CsvStudentRow;
  }

  private normalizeCsvHeader(header: string): string {
    const key = (header ?? '')
      .trim()
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

    const aliases: Record<string, string> = {
      firstname: 'firstName',
      prenom: 'firstName',
      lastname: 'lastName',
      nom: 'lastName',
      displayname: 'displayName',
      nomaffiche: 'displayName',
      email: 'email',
      mail: 'email',
      codeestablishment: 'codeEstablishment',
      codeetablissement: 'codeEstablishment',
      uaicode: 'codeEstablishment',
      schoolcode: 'codeEstablishment',
      establishmentid: 'codeEstablishment',
      etablissementid: 'codeEstablishment',
      schoolid: 'codeEstablishment',
      firebaseuid: 'firebaseUid',
      phone: 'phone',
      telephone: 'phone',
      photourl: 'photoUrl',
      status: 'status',
      roleids: 'roleIds',
      profileid: 'profileId',
      isminor: 'isMinor',
    };

    return aliases[key] ?? header.trim();
  }

  private generateImportFirebaseUid(companyId: string, rowNumber: number): string {
    const normalized = companyId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const timestamp = Date.now().toString().slice(-10);
    const paddedRow = String(rowNumber).padStart(6, '0');
    return `csv-${normalized}-${timestamp}-${paddedRow}`;
  }

  private generateFirebaseUid(companyId: string): string {
    const normalized = companyId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.random().toString(36).substring(2, 10);
    return `auto-${normalized}-${timestamp}-${random}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  async findMe(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company', 'userRoles', 'userRoles.role', 'userProfiles'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findMeByFirebaseUid(firebaseUid: string): Promise<User> {
    try {
      console.log('[UsersService.findMeByFirebaseUid] Searching for user with Firebase UID:', firebaseUid);
      
      const user = await this.userRepository.findOne({
        where: { firebaseUid },
        relations: ['company', 'userRoles', 'userRoles.role', 'userProfiles'],
      });
      
      if (!user) {
        console.error('[UsersService.findMeByFirebaseUid] User not found in database');
        console.error('[UsersService.findMeByFirebaseUid] Firebase UID searched:', firebaseUid);
        
        const allUsers = await this.userRepository.find({
          select: ['id', 'firebaseUid', 'email', 'firstName', 'lastName'],
          take: 5,
        });
        console.log('[UsersService.findMeByFirebaseUid] Sample users in DB:', allUsers);
        
        throw new NotFoundException(`User with Firebase UID "${firebaseUid}" not found in database`);
      }
      
      console.log('[UsersService.findMeByFirebaseUid] User found:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      // Aggregate permissions from all user roles
      const aggregatedPermissions: Record<string, string[]> = {};
      
      for (const userRole of user.userRoles || []) {
        const rolePermissions = userRole.role?.permissions || {};
        for (const [resource, actions] of Object.entries(rolePermissions)) {
          if (!aggregatedPermissions[resource]) {
            aggregatedPermissions[resource] = [];
          }
          const actionsArray = Array.isArray(actions) ? actions : [];
          for (const action of actionsArray) {
            if (!aggregatedPermissions[resource].includes(action)) {
              aggregatedPermissions[resource].push(action);
            }
          }
        }
      }

      console.log('[UsersService.findMeByFirebaseUid] Aggregated permissions:', aggregatedPermissions);

      // Build interface access map from role_interface_elements
      // Modèle présence : la simple présence d'une row RIE signifie accès (visible=true, editable=true)
      const roleIds = (user.userRoles || []).map((ur) => ur.roleId).filter(Boolean);
      const interfaceAccess: Record<string, { elements?: Record<string, { visible: boolean; editable: boolean; parentElementId?: string | null }> }> = {};

      if (roleIds.length > 0) {
        // Get all role_interface_elements for this user's roles
        const interfaceElements = await this.roleInterfaceElementsRepository
          .createQueryBuilder('rie')
          .leftJoinAndSelect('rie.element', 'element')
          .leftJoinAndSelect('element.parent', 'parent')
          .where('rie.role_id IN (:...roleIds)', { roleIds })
          .andWhere('rie.company_id = :companyId', { companyId: user.companyId })
          .andWhere('element.company_id = :companyId', { companyId: user.companyId })
          .getMany();

        // Group by interface_name — use actual visible/editable values from role_interface_elements
        const byInterface = new Map<string, Array<{
          elementId: string;
          parentElementId?: string | null;
          visible: boolean;
        }>>();

        for (const rie of interfaceElements) {
          const interfaceName = rie.element?.interfaceName;
          const elementId = rie.element?.elementId;
          const parentElementId = rie.element?.parent?.elementId || null;
          const visible = rie.visible ?? true; // Use actual visible value from rie, default to true if null
          if (!interfaceName || !elementId) continue;

          if (!byInterface.has(interfaceName)) {
            byInterface.set(interfaceName, []);
          }
          byInterface.get(interfaceName)!.push({
            elementId: elementId,
            parentElementId: parentElementId,
            visible: visible,
          });
        }

        for (const [interfaceName, permissions] of byInterface.entries()) {
          const elementsMap: Record<string, { visible: boolean; editable: boolean; parentElementId?: string | null }> = {};
          for (const perm of permissions) {
            if (!elementsMap[perm.elementId]) {
              // Use actual visible value from role_interface_elements
              elementsMap[perm.elementId] = {
                visible: perm.visible,
                editable: true, // Keep editable as true for now (can be added to RIE later if needed)
                parentElementId: perm.parentElementId,
              };
            } else {
              // If multiple roles have access, use OR logic for visible (true if ANY role grants visibility)
              elementsMap[perm.elementId].visible = elementsMap[perm.elementId].visible || perm.visible;
            }
          }
          interfaceAccess[interfaceName] = { elements: elementsMap };
        }
      }

      console.log('[UsersService.findMeByFirebaseUid] Interface access:', interfaceAccess);

      // Attach permissions and interfaceAccess to user object
      (user as any).permissions = aggregatedPermissions;
      (user as any).interfaceAccess = interfaceAccess;
      
      return user;
    } catch (error) {
      console.error('[UsersService.findMeByFirebaseUid] Error:', error);
      throw error;
    }
  }

  async findAll(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: { status?: UserStatus; q?: string; roleId?: string; excludeIds?: string },
  ): Promise<PaginatedResponse<User>> {
    try {
      const { skip, take } = getSkipTake(page, pageSize);

      const qb = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.userRoles', 'userRole')
        .leftJoinAndSelect('userRole.role', 'role')
        .leftJoinAndSelect('user.userProfiles', 'userProfile')
        .leftJoinAndSelect('userProfile.level', 'level')
        .leftJoinAndSelect('user.userEstablishments', 'userEstablishment')
        .leftJoinAndSelect('userEstablishment.establishment', 'establishment')
        .where('user.company_id = :companyId', { companyId });

      if (filters?.status) {
        qb.andWhere('user.status = :status', { status: filters.status });
      }
      if (filters?.q?.trim()) {
        const terms = filters.q.trim().split(/\s+/).filter(t => t.length > 0);
        if (terms.length === 1) {
          const search = `%${terms[0]}%`;
          qb.andWhere(
            '(UNACCENT(user.first_name) ILIKE UNACCENT(:search) OR UNACCENT(user.last_name) ILIKE UNACCENT(:search) OR UNACCENT(user.email) ILIKE UNACCENT(:search) OR UNACCENT(user.display_name) ILIKE UNACCENT(:search))',
            { search },
          );
        } else {
          terms.forEach((term, i) => {
            const paramName = `searchTerm${i}`;
            qb.andWhere(
              `(UNACCENT(user.first_name) ILIKE UNACCENT(:${paramName}) OR UNACCENT(user.last_name) ILIKE UNACCENT(:${paramName}))`,
              { [paramName]: `%${term}%` },
            );
          });
        }
      }
      if (filters?.roleId) {
        qb.andWhere('userRole.role_id = :roleId', {
          roleId: filters.roleId,
        });
      }
      
      if (filters?.excludeIds?.trim()) {
        const idsToExclude = filters.excludeIds
          .split(',')
          .map(id => id.trim())
          .filter(id => id.length > 0);
        
        if (idsToExclude.length > 0) {
          qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds: idsToExclude });
        }
      }

      const [data, total] = await qb
        .orderBy('user.createdAt', 'DESC')
        .skip(skip)
        .take(take)
        .getManyAndCount();
      return createPaginatedResponse(data, total, page, pageSize);
    } catch (error) {
      console.error('[UsersService.findAll] Error:', error);
      throw error;
    }
  }

  async findOne(id: string, companyId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, companyId },
      relations: [
        'company',
        'userRoles',
        'userRoles.role',
        'userProfiles',
        'userProfiles.level',
        'userProfiles.schoolClass',
        'userProfiles.schoolClass.schoolYear',
        'userProfiles.schoolClass.level',
        'userProfiles.schoolClass.establishment',
        'userProfiles.userProfileSpecialties',
        'userProfiles.userProfileSpecialties.specialty',
        'userEstablishments',
        'userEstablishments.establishment',
        'managedBy',
      ],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  /**
   * All users in the company with the STUDENT role. For mobile Élèves tab.
   * Returns id, firstName, lastName (and optionally program from userProfiles if needed).
   */
  async findStudentsByCompany(companyId: string): Promise<User[]> {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('UPPER(role.code) = :code', { code: 'STUDENT' })
      .getMany();
    if (!roles.length) return [];
    const roleIds = roles.map((r) => r.id);
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'ur', 'ur.role_id IN (:...roleIds)', { roleIds })
      .where('user.company_id = :companyId', { companyId })
      .andWhere('user.deleted_at IS NULL')
      .orderBy('user.last_name', 'ASC')
      .addOrderBy('user.first_name', 'ASC')
      .getMany();
  }

  /**
   * Users linked to the given establishment and having at least one of the given role codes (e.g. ['STUDENT'], ['TEACHER', 'VOLUNTEER']).
   * Returns users with userProfiles for use in assignment candidates (filter by subject + availability elsewhere).
   */
  async findUsersByEstablishmentAndRoleCodes(
    companyId: string,
    establishmentId: string,
    roleCodes: string[],
  ): Promise<User[]> {
    if (!roleCodes.length) return [];
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('UPPER(role.code) IN (:...roleCodes)', { 
        roleCodes: roleCodes.map(code => code.toUpperCase()) 
      })
      .getMany();
    if (!roles.length) return [];
    const roleIds = roles.map((r) => r.id);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user_establishments', 'ue', 'ue.user_id = user.id AND ue.establishment_id = :establishmentId AND ue.company_id = :companyId', {
        establishmentId,
        companyId,
      })
      .innerJoin('user.userRoles', 'ur', 'ur.role_id IN (:...roleIds)', { roleIds })
      .where('user.company_id = :companyId', { companyId })
      .andWhere('user.deleted_at IS NULL');
    return qb
      .leftJoinAndSelect('user.userProfiles', 'up')
      .distinct(true)
      .getMany();
  }

  /**
   * Get all establishments for a user
   */
  async getUserEstablishments(companyId: string, userId: string) {
    const userEstablishments = await this.userEstablishmentRepository.find({
      where: { userId, companyId },
      relations: ['establishment'],
    });
    return userEstablishments.map((ue) => ue.establishment);
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateUserDto,
    actorUid: string,
    writeScope?: VisibilityScope | null,
  ): Promise<User> {
    const user = await this.findOne(id, companyId);
    
    // Verify access before proceeding (after loading user to get roles)
    if (actorUid && writeScope !== undefined) {
      const actorUser = await this.userRepository.findOne({ 
        where: { id: actorUid, companyId },
        relations: ['userRoles', 'userRoles.role']
      });
      const actorRoles = actorUser?.userRoles?.map(ur => ur.role?.code).filter(Boolean) as string[] || [];
      await this.assertUserAccess(id, companyId, actorUid, actorRoles, 'action-edit-row', writeScope);
    }
    const statusAtStart = user.status;
    const oldValue = { ...user } as unknown as Record<string, unknown>;

    const {
      subjects,
      availability,
      hasSpecialNeeds,
      specialNeedsType,
      specialNeedsNote,
      isDisabled,
      disabilityTypes,
      disabilityOtherNote,
      deactivationReason,
      deactivationReasonNote,
      exitReason,
      exitReasonNote,
      guardianContact,
      vscReportsFrequencies,
      dateOfBirth,
      gender,
      levelId,
      medicalNotes,
      schoolClassId,
      specialtyIds,
      establishmentIds,
      managedById,
      roleIds,
      engagementStartDate,
      engagementEndDate,
      professionalSituation,
      targetHours,
      addressLine1,
      department,
      postalCode,
      city,
      country,
      ...userFields
    } = dto;

    const effectiveHasStudent =
      dto.roleIds !== undefined
        ? await this.userWillHaveStudentRole(companyId, dto.roleIds)
        : await this.userHasStudentRole(id, companyId);
    if (dto.status !== undefined && !statusMatchesRoleModel(effectiveHasStudent, dto.status)) {
      throw new BadRequestException(
        effectiveHasStudent
          ? 'Invalid status for student account (registered, accompanied, deactivated).'
          : 'Invalid status for staff account (active, deactivated).',
      );
    }

    if (establishmentIds !== undefined) {
      await this.assertEstablishmentsBelongToCompany(companyId, establishmentIds);
    }
    if (managedById !== undefined) {
      await this.assertManagedByValid(companyId, managedById, id);
    }

    Object.assign(user, userFields);
    if (managedById !== undefined) {
      user.managedById = managedById;
    }
    const saved = await this.userRepository.save(user);

    if (establishmentIds !== undefined) {
      await this.replaceUserEstablishmentLinks(id, companyId, establishmentIds);
    }
    if (roleIds !== undefined) {
      await this.replaceUserRoles(id, companyId, roleIds);
      await this.coerceUserStatusAfterRoleChange(id, companyId);
    }

    if (schoolClassId !== undefined) {
      await this.assertSchoolClassAssignable(companyId, id, schoolClassId);
    }

    if (professionalSituation !== undefined && !(await this.userHasTutorRole(id))) {
      throw new BadRequestException('professionalSituation applies only to users in the tutors group');
    }

    // Check if user has STUDENT role to auto-calculate isMinor
    const isStudent = await this.userHasStudentRole(id, companyId);
    
    if (
      subjects !== undefined ||
      availability !== undefined ||
      hasSpecialNeeds !== undefined ||
      specialNeedsType !== undefined ||
      specialNeedsNote !== undefined ||
      isDisabled !== undefined ||
      disabilityTypes !== undefined ||
      disabilityOtherNote !== undefined ||
      guardianContact !== undefined ||
      vscReportsFrequencies !== undefined ||
      dateOfBirth !== undefined ||
      gender !== undefined ||
      levelId !== undefined ||
      medicalNotes !== undefined ||
      schoolClassId !== undefined ||
      specialtyIds !== undefined ||
      engagementStartDate !== undefined ||
      engagementEndDate !== undefined ||
      professionalSituation !== undefined ||
      targetHours !== undefined ||
      addressLine1 !== undefined ||
      department !== undefined ||
      postalCode !== undefined ||
      city !== undefined ||
      country !== undefined
    ) {
      let userProfile = await this.userProfileRepository.findOne({
        where: { userId: id },
      });

      if (userProfile) {
        if (subjects !== undefined) {
          userProfile.subjects = subjects;
          // Auto-resolve subject names when subjects are updated
          userProfile.subjectNames = await resolveSubjectNames(subjects, this.subjectRepository);
        }
        if (dto.subjectNames !== undefined) {
          userProfile.subjectNames = dto.subjectNames;
        }
        if (availability !== undefined) {
          userProfile.availability = availability;
        }
        // Auto-calculate isMinor for STUDENT users based on dateOfBirth
        if (isStudent && dateOfBirth !== undefined) {
          userProfile.isMinor = this.calculateIsMinor(dateOfBirth);
        } else if (isStudent && userProfile.dateOfBirth) {
          // Recalculate if dateOfBirth exists but wasn't updated this time
          userProfile.isMinor = this.calculateIsMinor(userProfile.dateOfBirth);
        }
        if (hasSpecialNeeds !== undefined) {
          userProfile.hasSpecialNeeds = hasSpecialNeeds;
        }
        if (specialNeedsType !== undefined) {
          userProfile.specialNeedsType = specialNeedsType || null;
        }
        if (specialNeedsNote !== undefined) {
          userProfile.specialNeedsNote = specialNeedsNote || null;
        }
        if (isDisabled !== undefined) {
          userProfile.isDisabled = isDisabled;
        }
        if (disabilityTypes !== undefined) {
          userProfile.disabilityTypes = disabilityTypes.length > 0 ? disabilityTypes : null;
        }
        if (disabilityOtherNote !== undefined) {
          userProfile.disabilityOtherNote = disabilityOtherNote || null;
        }
        if (guardianContact !== undefined) {
          userProfile.guardianContact = guardianContact;
        }
        if (vscReportsFrequencies !== undefined) {
          userProfile.vscReportsFrequencies = vscReportsFrequencies;
        }
        if (dateOfBirth !== undefined) {
          userProfile.dateOfBirth = dateOfBirth;
        }
        if (gender !== undefined) {
          userProfile.gender = gender;
        }
        if (levelId !== undefined) {
          userProfile.levelId = levelId;
        }
        if (medicalNotes !== undefined) {
          userProfile.medicalNotes = medicalNotes;
        }
        if (addressLine1 !== undefined) {
          userProfile.addressLine1 = addressLine1?.trim() ? addressLine1.trim() : null;
        }
        if (department !== undefined) {
          userProfile.department = department?.trim() ? department.trim() : null;
        }
        if (postalCode !== undefined) {
          userProfile.postalCode = postalCode?.trim() ? postalCode.trim() : null;
        }
        if (city !== undefined) {
          userProfile.city = city?.trim() ? city.trim() : null;
        }
        if (country !== undefined) {
          userProfile.country =
            country != null && String(country).trim()
              ? String(country).trim().toUpperCase().slice(0, 2)
              : 'FR';
        }
        if (schoolClassId !== undefined) {
          userProfile.schoolClassId = schoolClassId;
        }
        if (engagementStartDate !== undefined) {
          userProfile.engagementStartDate =
            engagementStartDate && String(engagementStartDate).trim()
              ? new Date(engagementStartDate)
              : null;
        }
        if (engagementEndDate !== undefined) {
          userProfile.engagementEndDate =
            engagementEndDate && String(engagementEndDate).trim()
              ? new Date(engagementEndDate)
              : null;
        }
        if (professionalSituation !== undefined) {
          userProfile.professionalSituation = professionalSituation;
        }
        if (targetHours !== undefined) {
          userProfile.targetHours = targetHours ?? null;
        }
        // exitReason is handled later via exit_date sync; only update directly if not a status change
        await this.userProfileRepository.save(userProfile);
      } else {
        // Create UserProfile if it doesn't exist
        const calculatedIsMinor = isStudent ? this.calculateIsMinor(dateOfBirth || null) : false;
        const subjectNames = await resolveSubjectNames(subjects, this.subjectRepository);
        
        userProfile = this.userProfileRepository.create({
          userId: id,
          profileId: null,
          profileLabel: null,
          subjects: subjects || [],
          subjectNames,
          availability: availability || null,
          isMinor: calculatedIsMinor,
          hasSpecialNeeds: hasSpecialNeeds || false,
          guardianContact: guardianContact || null,
          vscReportsFrequencies: vscReportsFrequencies || null,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          levelId: levelId || null,
          medicalNotes: medicalNotes || null,
          addressLine1: addressLine1?.trim() ? addressLine1.trim() : null,
          department: department?.trim() ? department.trim() : null,
          postalCode: postalCode?.trim() ? postalCode.trim() : null,
          city: city?.trim() ? city.trim() : null,
          country:
            country != null && String(country).trim()
              ? String(country).trim().toUpperCase().slice(0, 2)
              : 'FR',
          schoolClassId: schoolClassId !== undefined ? schoolClassId : null,
          engagementStartDate:
            engagementStartDate && String(engagementStartDate).trim()
              ? new Date(engagementStartDate)
              : null,
          engagementEndDate:
            engagementEndDate && String(engagementEndDate).trim()
              ? new Date(engagementEndDate)
              : null,
          professionalSituation: professionalSituation ?? null,
          targetHours: targetHours ?? null,
        });
        await this.userProfileRepository.save(userProfile);
      }
    }

    if (specialtyIds !== undefined) {
      if (!(await this.userHasStudentRole(id, companyId))) {
        throw new BadRequestException('Specialties can only be set for students');
      }
      const profile = await this.userProfileRepository.findOne({ where: { userId: id } });
      if (!profile) {
        throw new BadRequestException('User profile is required to set specialties');
      }
      const prevLinks = await this.userProfileSpecialtyRepository.find({
        where: { userProfileId: profile.id },
      });
      const prevIds = prevLinks.map((l) => l.specialtyId);
      await this.assertStudentSpecialtyIdsAllowed(companyId, id, specialtyIds, prevIds);
      await this.replaceUserProfileSpecialtyLinks(profile.id, specialtyIds);
    }

    const finalRow = await this.userRepository.findOne({ where: { id, companyId } });
    const actor = await this.userRepository.findOne({ where: { id: actorUid } });

    if (
      finalRow &&
      (await this.userHasStudentRole(id, companyId)) &&
      isStudentAccountStatus(statusAtStart) &&
      isStudentAccountStatus(finalRow.status) &&
      finalRow.status !== statusAtStart
    ) {
      const source: UserStatusChangeSource =
        dto.status !== undefined ? 'patch' : 'role_coerce';
      await this.recordStudentStatusChangeDual(
        companyId,
        id,
        actor?.id ?? null,
        statusAtStart,
        finalRow.status,
        source,
        finalRow.status === 'deactivated' ? (deactivationReason || null) : null,
        finalRow.status === 'deactivated' && deactivationReason === 'Autre'
          ? (deactivationReasonNote || null)
          : null,
      );
      // Sync exit_date on user_profiles: set when deactivated, clear when reactivated
      await this.userProfileRepository.update(
        { userId: id },
        { exitDate: finalRow.status === 'deactivated' ? new Date() : null },
      );
    } else if (
      finalRow?.status === 'deactivated' &&
      statusAtStart === 'deactivated' &&
      (deactivationReason !== undefined || deactivationReasonNote !== undefined)
    ) {
      // Statut déjà deactivated — mettre à jour (ou effacer) le motif sur la dernière entrée
      const latestEntry = await this.studentStatusHistoryRepository.findOne({
        where: { studentUserId: id, newStatus: 'deactivated' },
        order: { createdAt: 'DESC' },
      });
      if (latestEntry) {
        const nextReason =
          deactivationReason !== undefined ? deactivationReason || null : latestEntry.reason;
        const nextReasonNote =
          nextReason === 'Autre'
            ? deactivationReasonNote !== undefined
              ? deactivationReasonNote || null
              : latestEntry.reasonNote
            : null;
        await this.studentStatusHistoryRepository.update(latestEntry.id, {
          reason: nextReason,
          reasonNote: nextReasonNote,
        });
      }
    } else if (finalRow && !(await this.userHasStudentRole(id, companyId))) {
      // Sync exit_date + exit_reason for non-students (tutors/volunteers) on status change
      if (finalRow.status === 'deactivated' && statusAtStart !== 'deactivated') {
        // Build the exit reason: combine base reason + free-text note for "Autre"
        const resolvedExitReason = exitReason ?? null;
        await this.userProfileRepository.update(
          { userId: id },
          {
            exitDate: new Date(),
            exitReason: resolvedExitReason,
            exitReasonNote: exitReasonNote ?? null,
          },
        );
      } else if (finalRow.status !== 'deactivated' && statusAtStart === 'deactivated') {
        // Reactivation: clear exit date and reason
        await this.userProfileRepository.update(
          { userId: id },
          { exitDate: null, exitReason: null, exitReasonNote: null },
        );
      } else if (finalRow.status === 'deactivated' && exitReason !== undefined) {
        // Status unchanged but reason is being updated
        const resolvedExitReason = exitReason ?? null;
        await this.userProfileRepository.update(
          { userId: id },
          { exitReason: resolvedExitReason, exitReasonNote: exitReasonNote ?? null },
        );
      }
    }

    await this.auditLogService.log({
      companyId,
      userId: actor?.id,
      entity: 'users',
      entityId: saved.id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return this.findOne(id, companyId);
  }

  /**
   * Counts sessions where the user participated as a student with presence recorded.
   */
  async getStudentPresentSessionsCount(userId: string): Promise<number> {
    return this.sessionParticipantRepository.count({
      where: { userId, role: 'student', attendanceStatus: 'present' },
    });
  }

  /**
   * Réactive un compte élève désactivé ou un compte staff désactivé.
   */
  async reactivateUser(id: string, companyId: string, actorUid: string, writeScope?: VisibilityScope | null): Promise<User> {
    const user = await this.findOne(id, companyId);
    
    // Verify access before proceeding
    if (actorUid && writeScope !== undefined) {
      const actorUser = await this.userRepository.findOne({ 
        where: { id: actorUid, companyId },
        relations: ['userRoles', 'userRoles.role']
      });
      const actorRoles = actorUser?.userRoles?.map(ur => ur.role?.code).filter(Boolean) as string[] || [];
      await this.assertUserAccess(id, companyId, actorUid, actorRoles, 'action-reactivate', writeScope);
    }
    const isStudent = await this.userHasStudentRole(id, companyId);
    const previousStatus = user.status;

    if (isStudent) {
      if (user.status !== 'deactivated') {
        throw new BadRequestException('Seuls les comptes élèves désactivés peuvent être réactivés');
      }
      const n = await this.getStudentPresentSessionsCount(id);
      const minSessions = this.getAccompaniedMinPresentSessions();
      user.status = n >= minSessions ? 'accompanied' : 'registered';
    } else {
      if (user.status !== 'deactivated') {
        throw new BadRequestException('Seuls les comptes désactivés peuvent être réactivés');
      }
      user.status = 'active';
    }

    const saved = await this.userRepository.save(user);
    const actor = await this.userRepository.findOne({ where: { id: actorUid } });
    if (isStudent) {
      await this.recordStudentStatusChangeDual(
        companyId,
        saved.id,
        actor?.id ?? null,
        previousStatus,
        saved.status,
        'reactivate',
      );
      // Clear exit_date on reactivation
      await this.userProfileRepository.update({ userId: id }, { exitDate: null });
    } else {
      await this.auditLogService.log({
        companyId,
        userId: actor?.id,
        entity: 'users',
        entityId: saved.id,
        action: 'UPDATE',
        oldValue: {
          status: previousStatus,
        } as Record<string, unknown>,
        newValue: { status: saved.status } as Record<string, unknown>,
      });
    }
    return this.findOne(saved.id, companyId);
  }

  async remove(id: string, companyId: string, actorUid: string, writeScope?: VisibilityScope | null): Promise<void> {
    const user = await this.findOne(id, companyId);
    
    // Verify access before proceeding
    if (actorUid && writeScope !== undefined) {
      const actorUser = await this.userRepository.findOne({ 
        where: { id: actorUid, companyId },
        relations: ['userRoles', 'userRoles.role']
      });
      const actorRoles = actorUser?.userRoles?.map(ur => ur.role?.code).filter(Boolean) as string[] || [];
      await this.assertUserAccess(id, companyId, actorUid, actorRoles, 'action-delete-row', writeScope);
    }

    const actor = await this.userRepository.findOne({ where: { id: actorUid } });
    await this.auditLogService.log({
      companyId,
      userId: actor?.id,
      entity: 'users',
      entityId: user.id,
      action: 'DELETE',
      oldValue: { id: user.id, email: user.email } as Record<string, unknown>,
    });

    await this.userRepository.softDelete(id);

    if (user.firebaseUid) {
      try {
        await admin.auth().deleteUser(user.firebaseUid);
      } catch (err) {
        this.logger.warn(
          `[UsersService.remove] Firebase deletion failed for uid=${user.firebaseUid}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * Dynamically retrieve all role codes belonging to a specific role group
   * @param companyId - The company ID
   * @param roleGroup - The role group name (e.g., 'volunteers', 'tutors')
   * @returns Array of role codes in uppercase
   */
  private async getRoleCodesByGroup(companyId: string, roleGroup: string): Promise<string[]> {
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('role.role_group = :roleGroup', { roleGroup })
      .getMany();
    return roles.map((r) => r.code.toUpperCase());
  }

  /** Sum completed/closed session hours per tutor or volunteer (not persisted on User). */
  private async attachTutorHoursDone(companyId: string, users: User[], participantRole: 'tutor' | 'volunteer' = 'tutor'): Promise<void> {
    if (!users.length) {
      return;
    }

    const userIds = users.map((u) => u.id);
    const rows = await this.sessionParticipantRepository
      .createQueryBuilder('sp')
      .select('sp.user_id', 'userId')
      .addSelect(
        `COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600.0), 0)`,
        'hoursDone',
      )
      .innerJoin('sp.session', 's')
      .where('sp.user_id IN (:...userIds)', { userIds })
      .andWhere('sp.role = :role', { role: participantRole })
      .andWhere('sp.attendance_status != :absent', { absent: 'absent' })
      .andWhere('s.status IN (:...statuses)', { statuses: ['COMPLETED', 'CLOSED'] })
      .andWhere('s.company_id = :companyId', { companyId })
      .andWhere('s.deleted_at IS NULL')
      .groupBy('sp.user_id')
      .getRawMany<{ userId: string; hoursDone: string }>();

    const hoursMap = new Map(
      rows.map((row) => [row.userId, Number.parseFloat(String(row.hoursDone))]),
    );
    for (const user of users) {
      user.hoursDone = hoursMap.get(user.id) ?? 0;
    }
  }

  /** Compute attendance rate (%) per tutor or volunteer (not persisted on User). */
  private async attachAttendanceRate(companyId: string, users: User[], participantRole: 'tutor' | 'volunteer' = 'tutor'): Promise<void> {
    if (!users.length) return;

    const userIds = users.map((u) => u.id);

    const rows = await this.sessionParticipantRepository
      .createQueryBuilder('sp')
      .select('sp.user_id', 'userId')
      .addSelect(`COUNT(*)`, 'totalSessions')
      .addSelect(
        `COUNT(*) FILTER (WHERE sp.attendance_status IS DISTINCT FROM 'absent')`,
        'presentSessions',
      )
      .innerJoin('sp.session', 's')
      .where('sp.user_id IN (:...userIds)', { userIds })
      .andWhere('sp.role = :role', { role: participantRole })
      .andWhere('s.status IN (:...statuses)', { statuses: ['COMPLETED', 'CLOSED'] })
      .andWhere('s.company_id = :companyId', { companyId })
      .andWhere('s.deleted_at IS NULL')
      .groupBy('sp.user_id')
      .getRawMany<{ userId: string; totalSessions: string; presentSessions: string }>();

    const rateMap = new Map(
      rows.map((row) => {
        const total = Number(row.totalSessions);
        const present = Number(row.presentSessions);
        return [row.userId, total > 0 ? Math.round((present / total) * 100) : null];
      }),
    );
    for (const user of users) {
      (user as any).attendanceRate = rateMap.get(user.id) ?? null;
    }
  }

  /**
   * Liste paginée d'un groupe de rôles (tutors / volunteers / admins) avec visibility scope
   * par onglet (tab-*) ou menu en repli.
   */
  private async findUsersInRoleGroupWithVisibility(
    companyId: string,
    roleGroup: string,
    interfaceName: 'tutors' | 'volunteers' | 'admins',
    page: number,
    pageSize: number,
    filters?: Record<string, unknown>,
    menuVisibilityScope?: VisibilityScope | null,
    currentUserId?: string,
    roleCodesFilter?: string[],
  ): Promise<PaginatedResponse<User>> {
    const scopeUser = currentUserId ? { userId: currentUserId, companyId } : undefined;
    const expanded = this.normalizeRoleCodesFilter(roleCodesFilter);
    const roleCodesInGroup =
      expanded.length > 0
        ? expanded.map((c) => c.toUpperCase())
        : await this.getRoleCodesByGroup(companyId, roleGroup);

    if (currentUserId && roleCodesInGroup.length > 0) {
      const allUsers: User[] = [];
      const seenIds = new Set<string>();

      for (const roleCode of roleCodesInGroup) {
        const tabElementId = `tab-${roleCode.toLowerCase()}`;
        const tabScope = await this.getTabVisibilityScope(
          companyId,
          currentUserId,
          interfaceName,
          tabElementId,
        );
        const effectiveScope = tabScope ?? menuVisibilityScope ?? null;

        const result = await this.findUsersByRoleCodes(
          companyId,
          [roleCode],
          1,
          10000,
          filters ? { ...filters, roleCodes: undefined } : undefined,
          effectiveScope,
          scopeUser,
        );

        for (const user of result.data) {
          if (!seenIds.has(user.id)) {
            seenIds.add(user.id);
            allUsers.push(user);
          }
        }
      }

      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return createPaginatedResponse(
        allUsers.slice(startIndex, endIndex),
        allUsers.length,
        page,
        pageSize,
      );
    }

    return this.findUsersByRoleCodes(
      companyId,
      roleCodesInGroup,
      page,
      pageSize,
      filters,
      menuVisibilityScope ?? null,
      scopeUser,
    );
  }

  /**
   * Récupère le visibility scope d'un TAB spécifique pour un user donné
   */
  private async getTabVisibilityScope(
    companyId: string,
    currentUserId: string,
    interfaceName: string,
    tabElementId: string,
  ): Promise<VisibilityScope | null> {
    // Récupérer les rôles du user
    const user = await this.userRepository.findOne({
      where: { id: currentUserId, companyId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) return null;

    const userRoleCodes = user.userRoles.map(ur => ur.role.code.toUpperCase());

    // Récupérer le visibility scope du tab pour un des rôles du user
    const rie = await this.roleInterfaceElementsRepository
      .createQueryBuilder('rie')
      .innerJoin('rie.element', 'ie')
      .innerJoin('rie.role', 'role')
      .where('ie.company_id = :companyId', { companyId })
      .andWhere('ie.interface_name = :interfaceName', { interfaceName })
      .andWhere('ie.element_id = :tabElementId', { tabElementId })
      .andWhere('UPPER(role.code) IN (:...userRoleCodes)', { userRoleCodes })
      .andWhere('rie.visible = :visible', { visible: true })
      .select('rie.visibility_scope', 'visibilityScope')
      .getRawOne();

    const raw = rie?.visibilityScope as VisibilityScope | null | undefined;
    const normalized = normalizeVisibilityScope(raw);
    return (normalized && !('rules' in normalized)
      ? normalized
      : raw) as VisibilityScope | null;
  }

  /**
   * Generic method to find users by role codes with pagination and filtering
   */
  private async findUsersByRoleCodes(
    companyId: string,
    roleCodes: string[],
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      levelIds?: string[];
      classIds?: string[];
      specialtyIds?: string[];
      roleCodes?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
      /** 0=Sun .. 6=Sat; OR semantics when used without precise availability window */
      availabilityDays?: number[];
      restrictToUserIds?: string[];
      managedByUserId?: string;
      operator?: 'AND' | 'OR';
      isMinor?: boolean;
      hasSpecialNeeds?: boolean;
      vscFrequencies?: ('daily' | 'weekly')[];
      engagementStartDateFrom?: string;
      engagementStartDateTo?: string;
      tutorExitDateFrom?: string;
      tutorExitDateTo?: string;
      tutorExitReason?: string;
    },
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
    entityType?: EntityType,
  ): Promise<PaginatedResponse<User>> {
    const hasAvailabilityFilter =
      filters?.availabilityDayOfWeek !== undefined ||
      filters?.availabilityStartTime !== undefined ||
      filters?.availabilityEndTime !== undefined;

    const hasAvailabilityDaysFilter = (filters?.availabilityDays?.length ?? 0) > 0;
    const hasVscFrequenciesFilter = (filters?.vscFrequencies?.length ?? 0) > 0;

    let availabilityUtc:
      | { dayOfWeek: number; startMinutes: number; endMinutes: number }
      | undefined;
    if (hasAvailabilityFilter) {
      if (
        filters?.availabilityDayOfWeek === undefined ||
        !filters?.availabilityStartTime ||
        !filters?.availabilityEndTime
      ) {
        throw new BadRequestException(
          'availabilityDayOfWeek, availabilityStartTime and availabilityEndTime are required together',
        );
      }
      availabilityUtc = await this.convertAvailabilityToFilter(
        filters.availabilityDayOfWeek,
        filters.availabilityStartTime,
        filters.availabilityEndTime,
      );
    }

    const { skip, take } = getSkipTake(page, pageSize);

    // If roleCodes filter is provided, use it instead of the method parameter
    const effectiveRoleCodes = filters?.roleCodes?.length ? filters.roleCodes : roleCodes;

    if (!effectiveRoleCodes.length) {
      return createPaginatedResponse([], 0, page, pageSize);
    }

    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('UPPER(role.code) IN (:...roleCodes)', { 
        roleCodes: effectiveRoleCodes.map(code => code.toUpperCase()) 
      })
      .getMany();

    if (!roles.length) {
      return createPaginatedResponse([], 0, page, pageSize);
    }

    const roleIds = roles.map((r) => r.id);

    // Build subquery to get user IDs with the role
    let subQuery = this.userRepository
      .createQueryBuilder('user')
      .select('user.id')
      .leftJoin('user.userRoles', 'userRole')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('userRole.role_id IN (:...roleIds)', { roleIds });

    if (filters?.restrictToUserIds?.length) {
      subQuery.andWhere('user.id IN (:...restrictToUserIds)', {
        restrictToUserIds: filters.restrictToUserIds,
      });
    }

    // Apply visibility scope via the resolver if provided
    if (visibilityScope && scopeUser) {
      await this.visibilityScopeResolver.applyToQueryBuilder(subQuery, visibilityScope, 'users', scopeUser);
    }

    if (filters?.search?.trim()) {
      const searchTerm = filters.search.trim();
      
      // Check if search term looks like an email (contains @ and .)
      const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchTerm);
      
      // Check if search term looks like a phone number
      // Accepts: digits only, or starts with +, can contain spaces/dashes/parentheses
      const looksLikePhone = /^(\+)?[\d\s\-\(\)]+$/.test(searchTerm);
      
      if (looksLikeEmail) {
        // Search ONLY in email
        const search = `%${searchTerm}%`;
        subQuery.andWhere('UNACCENT(user.email) ILIKE UNACCENT(:search)', { search });
      } else if (looksLikePhone) {
        // Search ONLY in phone_number - use quoted identifier
        const search = `%${searchTerm}%`;
        subQuery.andWhere('"user"."phone" ILIKE :phoneSearch', { phoneSearch: search });
      } else {
        // Regular text search: firstName, lastName, displayName
        const terms = searchTerm.split(/\s+/).filter(t => t.length > 0);
        
        if (terms.length === 1) {
          const search = `%${terms[0]}%`;
          subQuery.andWhere(
            '(UNACCENT(user.first_name) ILIKE UNACCENT(:search) OR UNACCENT(user.last_name) ILIKE UNACCENT(:search) OR UNACCENT(user.display_name) ILIKE UNACCENT(:search))',
            { search },
          );
        } else {
          // Multiple terms: search in first_name and last_name only
          terms.forEach((term, i) => {
            const paramName = `searchTerm${i}`;
            subQuery.andWhere(
              `(UNACCENT(user.first_name) ILIKE UNACCENT(:${paramName}) OR UNACCENT(user.last_name) ILIKE UNACCENT(:${paramName}))`,
              { [paramName]: `%${term}%` },
            );
          });
        }
      }
    }

    if (filters?.excludeIds?.trim()) {
      const idsToExclude = filters.excludeIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      
      if (idsToExclude.length > 0) {
        subQuery.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds: idsToExclude });
      }
    }

    if (filters?.statuses?.length) {
      subQuery.andWhere('user.status IN (:...statuses)', { statuses: filters.statuses });
    }

    if (filters?.dateFrom) {
      subQuery.andWhere('user.created_at >= :dateFrom', { dateFrom: parseLocalDate(filters.dateFrom) });
    }

    if (filters?.dateTo) {
      subQuery.andWhere('user.created_at <= :dateTo', { dateTo: parseLocalDateEndOfDay(filters.dateTo) });
    }

    const establishmentIds =
      filters?.establishmentIds?.length
        ? filters.establishmentIds
        : filters?.establishmentId
          ? [filters.establishmentId]
          : undefined;

    const needsUserProfile =
      (filters?.subjectIds?.length ?? 0) > 0 ||
      (filters?.levelIds?.length ?? 0) > 0 ||
      (filters?.classIds?.length ?? 0) > 0 ||
      (filters?.specialtyIds?.length ?? 0) > 0 ||
      hasAvailabilityFilter ||
      hasAvailabilityDaysFilter ||
      hasVscFrequenciesFilter ||
      filters?.isMinor !== undefined ||
      filters?.hasSpecialNeeds !== undefined ||
      filters?.engagementStartDateFrom !== undefined ||
      filters?.engagementStartDateTo !== undefined ||
      filters?.tutorExitDateFrom !== undefined ||
      filters?.tutorExitDateTo !== undefined ||
      filters?.tutorExitReason !== undefined;

    if (needsUserProfile) {
      subQuery.leftJoin('user.userProfiles', 'userProfile');
    }

    // Extract managedByUserId and operator from filters
    const managedByUserId = filters?.managedByUserId;
    const operator = filters?.operator || 'OR';

    if (establishmentIds !== undefined || managedByUserId) {
      const conditions: string[] = [];
      const params: Record<string, any> = { companyId };

      // Condition 1: Établissements — tous les rôles passent par user_establishments
      if (establishmentIds !== undefined && establishmentIds.length > 0) {
        subQuery.innerJoin('user_establishments', 'ue',
          'ue.user_id = user.id AND ue.company_id = :companyId', { companyId });
        conditions.push('ue.establishment_id IN (:...establishmentIds)');
        params.establishmentIds = establishmentIds;
      }

      // Condition 2: ManagedBy
      if (managedByUserId) {
        console.log('[findUsersByRoleCodes] Filtering by managedBy:', managedByUserId);
        conditions.push('user.managed_by = :managedByUserId');
        params.managedByUserId = managedByUserId;
      }

      // Apply operator logic
      if (conditions.length > 0) {
        if (operator === 'AND') {
          // Intersection: both conditions must be true
          console.log('[findUsersByRoleCodes] Applying AND operator');
          conditions.forEach(cond => subQuery.andWhere(cond, params));
        } else {
          // Union (OR): at least one condition must be true
          console.log('[findUsersByRoleCodes] Applying OR operator');
          if (conditions.length === 1) {
            subQuery.andWhere(conditions[0], params);
          } else {
            subQuery.andWhere(`(${conditions.join(' OR ')})`, params);
          }
        }
      } else if (establishmentIds !== undefined && establishmentIds.length === 0 && !managedByUserId) {
        // User has NO establishments AND no managedBy → should see NOBODY
        console.log('[findUsersByRoleCodes] User has 0 establishments and no managedBy → returning empty result');
        subQuery.andWhere('1 = 0');
      }
    }

    if (filters?.subjectIds?.length) {
      appendUserProfileSubjectJsonbFilter(subQuery, filters.subjectIds, { paramSuffix: 'roleList' });
    }

    if (filters?.levelIds?.length) {
      subQuery
        .leftJoin('userProfile.level', 'level')
        .andWhere('level.id IN (:...levelIds)', { levelIds: filters.levelIds });
    }

    if (filters?.classIds?.length) {
      subQuery.andWhere('userProfile.school_class_id IN (:...classIds)', {
        classIds: filters.classIds,
      });
    }

    if (filters?.specialtyIds?.length) {
      subQuery.andWhere(
        'userProfile.id IN (SELECT ups.user_profile_id FROM user_profile_specialties ups WHERE ups.specialty_id IN (:...specialtyIds))',
        { specialtyIds: filters.specialtyIds },
      );
    }

    if (availabilityUtc) {
      subQuery.andWhere(
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE("userProfile"."availability"->'weekly', '[]'::jsonb)) AS slot
          WHERE (slot->>'day')::int = :availabilityUtcDay
            AND (
              split_part(slot->>'start', ':', 1)::int * 60
              + split_part(slot->>'start', ':', 2)::int
            ) <= :availabilityUtcStartMinutes
            AND (
              split_part(slot->>'end', ':', 1)::int * 60
              + split_part(slot->>'end', ':', 2)::int
            ) >= :availabilityUtcEndMinutes
        )`,
        {
          availabilityUtcDay: availabilityUtc.dayOfWeek,
          availabilityUtcStartMinutes: availabilityUtc.startMinutes,
          availabilityUtcEndMinutes: availabilityUtc.endMinutes,
        },
      );
    } else if (filters?.availabilityDays?.length) {
      subQuery.andWhere(
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE("userProfile"."availability"->'weekly', '[]'::jsonb)) AS slot_day_filter
          WHERE (slot_day_filter->>'day')::int IN (:...availabilityDayFilterNums)
        )`,
        { availabilityDayFilterNums: filters.availabilityDays },
      );
    }

    if (filters?.vscFrequencies?.length) {
      const vscIncDaily = filters.vscFrequencies.includes('daily');
      const vscIncWeekly = filters.vscFrequencies.includes('weekly');
      subQuery.andWhere(
        `(
          (:vscIncDaily = true AND COALESCE(("userProfile"."vsc_reports_frequencies"->>'daily')::boolean, false) = true)
          OR
          (:vscIncWeekly = true AND COALESCE(("userProfile"."vsc_reports_frequencies"->>'weekly')::boolean, false) = true)
        )`,
        { vscIncDaily, vscIncWeekly },
      );
    }

    if (filters?.isMinor !== undefined) {
      subQuery.andWhere('userProfile.is_minor = :isMinor', { isMinor: filters.isMinor });
    }

    if (filters?.hasSpecialNeeds !== undefined) {
      subQuery.andWhere('userProfile.has_special_needs = :hasSpecialNeeds', { hasSpecialNeeds: filters.hasSpecialNeeds });
    }

    if (filters?.engagementStartDateFrom) {
      subQuery.andWhere('userProfile.engagement_start_date >= :esdFrom', {
        esdFrom: parseLocalDate(filters.engagementStartDateFrom),
      });
    }

    if (filters?.engagementStartDateTo) {
      subQuery.andWhere('userProfile.engagement_start_date <= :esdTo', {
        esdTo: parseLocalDateEndOfDay(filters.engagementStartDateTo),
      });
    }

    if (filters?.tutorExitDateFrom) {
      subQuery.andWhere('userProfile.exit_date >= :tedFrom', {
        tedFrom: parseLocalDate(filters.tutorExitDateFrom),
      });
    }

    if (filters?.tutorExitDateTo) {
      subQuery.andWhere('userProfile.exit_date <= :tedTo', {
        tedTo: parseLocalDateEndOfDay(filters.tutorExitDateTo),
      });
    }

    if (filters?.tutorExitReason) {
      subQuery.andWhere('LOWER(userProfile.exit_reason) LIKE LOWER(:tutorExitReason)', {
        tutorExitReason: `%${filters.tutorExitReason}%`,
      });
    }

    subQuery.distinct(true);

    const idsSubQuery = subQuery.clone();

    const buildOuterFilteredUsers = () =>
      this.userRepository
        .createQueryBuilder('user')
        .where(`user.id IN (${idsSubQuery.getQuery()})`)
        .setParameters(idsSubQuery.getParameters());

    const total = await buildOuterFilteredUsers().getCount();

    const pageUsers = await buildOuterFilteredUsers()
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC')
      .skip(skip)
      .take(take)
      .getMany();

    if (pageUsers.length === 0) {
      return createPaginatedResponse([], total, page, pageSize);
    }

    const pageIds = pageUsers.map((u) => u.id);
    const data = await this.userRepository.find({
      where: { id: In(pageIds) },
      relations: [
        'userRoles',
        'userRoles.role',
        'userProfiles',
        'userProfiles.level',
        'userProfiles.schoolClass',
        'userProfiles.schoolClass.schoolYear',
        'userProfiles.schoolClass.level',
        'userProfiles.schoolClass.establishment',
        'userProfiles.userProfileSpecialties',
        'userProfiles.userProfileSpecialties.specialty',
        'userEstablishments',
        'userEstablishments.establishment',
      ],
    });

    const orderIndex = new Map(pageIds.map((id, index) => [id, index]));
    data.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

    const volunteerOnlyList =
      effectiveRoleCodes.length > 0 &&
      effectiveRoleCodes.every((c) => String(c).toUpperCase() === 'VOLUNTEER');

    for (const user of data) {
      const attachEngagement =
        volunteerOnlyList ||
        Boolean(
          user.userRoles?.some(
            (ur) => ur.role?.code && String(ur.role.code).toUpperCase() === 'VOLUNTEER',
          ),
        );
      if (!attachEngagement) {
        continue;
      }
      const profile =
        user.userProfiles?.find((p) => p.engagementEndDate != null) ??
        user.userProfiles?.[0];
      user.engagementDurationMonths = computeRemainingCalendarMonthsUntilDate(
        profile?.engagementEndDate,
      );
    }

    // Compute _permissions per row
    if (actionScopes && Object.keys(actionScopes).length > 0 && data.length > 0 && scopeUser && entityType) {
      const entityIds = data.map((u) => u.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              entityIds,
              'user.id',
              scope,
              entityType,
              scopeUser,
            );
            return [actionId, ids] as const;
          }
          return [actionId, new Set(entityIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      data.forEach((u) => {
        (u as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(u.id)]),
        );
      });
    }

    return createPaginatedResponse(data, total, page, pageSize);
  }

  /**
   * Generic method to find a single user by ID and verify they have one of the specified role codes
   */
  private async findUserByIdAndRoleCodes(
    id: string,
    companyId: string,
    roleCodes: string[],
    roleLabel: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, companyId },
      relations: [
        'company',
        'userRoles',
        'userRoles.role',
        'userProfiles',
        'userProfiles.level',
        'userProfiles.schoolClass',
        'userProfiles.schoolClass.schoolYear',
        'userProfiles.schoolClass.level',
        'userProfiles.schoolClass.establishment',
        'userProfiles.userProfileSpecialties',
        'userProfiles.userProfileSpecialties.specialty',
        'userEstablishments',
        'userEstablishments.establishment',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const hasRole = user.userRoles?.some((ur) =>
      roleCodes.includes(ur.role?.code),
    );

    if (!hasRole) {
      throw new NotFoundException(`${roleLabel} ${id} not found`);
    }

    return user;
  }

  /**
   * Find user by id, email, or phone with role verification
   */
  private async findUserByIdentifier(
    identifier: string,
    companyId: string,
    roleCodes: string[],
    roleLabel: string,
  ): Promise<User> {
    // Try by ID first (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let user: User | null = null;
    
    const relations = [
      'company',
      'userRoles',
      'userRoles.role',
      'userProfiles',
      'userProfiles.level',
      'userProfiles.schoolClass',
      'userProfiles.schoolClass.schoolYear',
      'userProfiles.schoolClass.level',
      'userProfiles.schoolClass.establishment',
      'userProfiles.userProfileSpecialties',
      'userProfiles.userProfileSpecialties.specialty',
      'userEstablishments',
      'userEstablishments.establishment',
    ];
    
    if (uuidRegex.test(identifier)) {
      user = await this.userRepository.findOne({
        where: { id: identifier, companyId },
        relations,
      });
    }
    
    // Try by email
    if (!user && identifier.includes('@')) {
      user = await this.userRepository.findOne({
        where: { email: identifier, companyId },
        relations,
      });
    }
    
    // Try by phone
    if (!user) {
      user = await this.userRepository.findOne({
        where: { phone: identifier, companyId },
        relations,
      });
    }
    
    if (!user) {
      throw new NotFoundException(`User ${identifier} not found`);
    }
    
    const hasRole = user.userRoles?.some((ur) =>
      roleCodes.map(code => code.toUpperCase()).includes(ur.role?.code?.toUpperCase()),
    );
    
    if (!hasRole) {
      throw new NotFoundException(`${roleLabel} ${identifier} not found`);
    }
    
    return user;
  }

  /**
   * Export students as Excel (.xlsx) (optionally filtered).
   * Columns: Statut, Nom Affiché, Genre, Date De Naissance, Mineur, Niveau,
   *          Adresse, Département, Code postal, Ville, Établissement,
   *          Matières suivies, Disponibilités, Notes, Date Création
   */
  async exportStudentsCsv(
    companyId: string,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      levelIds?: string[];
      classIds?: string[];
      roleCodes?: string[];
      dateFrom?: string;
      dateTo?: string;
      isMinor?: boolean;
      hasSpecialNeeds?: boolean;
    },
  ): Promise<Buffer> {
    const STUDENT_EXPORT_HEADERS = [
      'Nom Affiché',
      'Genre',
      'Date De Naissance',
      'Statut',
      'Mineur',
      'Niveau',
      'Adresse',
      'Département',
      'Code postal',
      'Ville',
      'Établissement',
      'Matières suivies',
      'Disponibilités',
      'Notes',
      'Date Création',
    ];

    const DAY_NAMES_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const formatAvailability = (availability: Record<string, unknown> | null | undefined): string => {
      if (!availability || typeof availability !== 'object') return '';
      const weekly = (availability as { weekly?: { day: number; start: string; end: string }[] }).weekly;
      if (!Array.isArray(weekly) || weekly.length === 0) return '';
      return weekly
        .map((slot) => `${DAY_NAMES_FR[slot.day] ?? `Jour ${slot.day}`} ${String(slot.start ?? '').trim()}-${String(slot.end ?? '').trim()}`)
        .join('; ');
    };

    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('UPPER(role.code) = :code', { code: 'STUDENT' })
      .getMany();

    if (!roles.length) {
      return buildXlsxBuffer({
        sheetName: 'Élèves',
        headerRow: STUDENT_EXPORT_HEADERS,
        dataRows: [],
      });
    }

    const roleIds = roles.map((r) => r.id);

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('user.userProfiles', 'userProfile')
      .leftJoinAndSelect('userProfile.level', 'level')
      .leftJoinAndSelect('user.userEstablishments', 'userEstablishment')
      .leftJoinAndSelect('userEstablishment.establishment', 'establishment')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('userRole.role_id IN (:...roleIds)', { roleIds })
      .andWhere('user.deleted_at IS NULL');

    if (filters?.search?.trim()) {
      const terms = filters.search.trim().split(/\s+/).filter(t => t.length > 0);
      if (terms.length === 1) {
        const search = `%${terms[0]}%`;
        query.andWhere(
          '(UNACCENT(user.first_name) ILIKE UNACCENT(:search) OR UNACCENT(user.last_name) ILIKE UNACCENT(:search) OR UNACCENT(user.email) ILIKE UNACCENT(:search) OR UNACCENT(user.display_name) ILIKE UNACCENT(:search))',
          { search },
        );
      } else {
        terms.forEach((term, i) => {
          const paramName = `searchTerm${i}`;
          query.andWhere(
            `(UNACCENT(user.first_name) ILIKE UNACCENT(:${paramName}) OR UNACCENT(user.last_name) ILIKE UNACCENT(:${paramName}))`,
            { [paramName]: `%${term}%` },
          );
        });
      }
    }

    if (filters?.excludeIds?.trim()) {
      const idsToExclude = filters.excludeIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      if (idsToExclude.length > 0) {
        query.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds: idsToExclude });
      }
    }

    if (filters?.statuses?.length) {
      query.andWhere('user.status IN (:...statuses)', { statuses: filters.statuses });
    }

    if (filters?.dateFrom) {
      query.andWhere('user.created_at >= :dateFrom', { dateFrom: parseLocalDate(filters.dateFrom) });
    }

    if (filters?.dateTo) {
      query.andWhere('user.created_at <= :dateTo', { dateTo: parseLocalDateEndOfDay(filters.dateTo) });
    }

    const exportEstablishmentIds =
      filters?.establishmentIds?.length
        ? filters.establishmentIds
        : filters?.establishmentId
          ? [filters.establishmentId]
          : undefined;

    if (exportEstablishmentIds?.length) {
      query.andWhere('userEstablishment.establishment_id IN (:...establishmentIds)', {
        establishmentIds: exportEstablishmentIds,
      });
    }

    if (filters?.levelIds?.length) {
      query.andWhere('userProfile.level_id IN (:...levelIds)', { levelIds: filters.levelIds });
    }

    if (filters?.classIds?.length) {
      query.andWhere('userProfile.school_class_id IN (:...classIds)', { classIds: filters.classIds });
    }

    if (filters?.subjectIds?.length) {
      appendUserProfileSubjectJsonbFilter(query, filters.subjectIds, { paramSuffix: 'stuXlsx' });
    }

    if (filters?.isMinor !== undefined) {
      query.andWhere('userProfile.is_minor = :isMinor', { isMinor: filters.isMinor });
    }

    if (filters?.hasSpecialNeeds !== undefined) {
      query.andWhere('userProfile.has_special_needs = :hasSpecialNeeds', { hasSpecialNeeds: filters.hasSpecialNeeds });
    }

    query
      .orderBy('user.display_name', 'ASC')
      .addOrderBy('user.first_name', 'ASC')
      .addOrderBy('user.last_name', 'ASC')
      .distinct(true);

    const students = await query.getMany();

    // Collect all subject IDs that need label resolution (only for profiles without subjectNames)
    const allSubjectIds = new Set<string>();
    for (const st of students) {
      const stProfile = st.userProfiles?.[0];
      if (!Array.isArray(stProfile?.subjectNames) || !stProfile.subjectNames.length) {
        (stProfile?.subjects ?? []).forEach((sub: unknown) => {
          const id = typeof sub === 'string' ? sub
            : (sub && typeof sub === 'object' && 'id' in sub ? String((sub as { id: unknown }).id) : null);
          if (id) allSubjectIds.add(id);
        });
      }
    }
    const subjectLabelMap = new Map<string, string>();
    if (allSubjectIds.size > 0) {
      const subjectEntities = await this.subjectRepository.findBy({ id: In([...allSubjectIds]) });
      subjectEntities.forEach((sub) => subjectLabelMap.set(sub.id, sub.label));
    }

    const rows = students.map((s) => {
      const profile = s.userProfiles?.[0];

      const levelLabel = profile?.level?.label ?? '';
      const establishmentNames = s.userEstablishments?.map(ue => ue.establishment?.name).filter(Boolean).join('; ') ?? '';

      const mineurText = profile?.isMinor === true ? 'vrai' : profile?.isMinor === false ? 'faux' : '';

      // Subject names: prefer pre-computed names, fall back to serialized JSONB
      let matieres = '';
      if (Array.isArray(profile?.subjectNames) && profile.subjectNames.length > 0) {
        matieres = profile.subjectNames.join('; ');
      } else if (Array.isArray(profile?.subjects) && profile.subjects.length > 0) {
        matieres = profile.subjects
          .map((sub: unknown) => {
            const id = typeof sub === 'string' ? sub
              : (sub && typeof sub === 'object' && 'id' in sub ? String((sub as { id: unknown }).id) : null);
            return id ? (subjectLabelMap.get(id) ?? '') : '';
          })
          .filter(Boolean)
          .join('; ');
      }

      const disponibilites = formatAvailability(profile?.availability);

      return [
        s.displayName ?? '',
        formatProfileGenderForExport(profile?.gender ?? null),
        formatExportDate(profile?.dateOfBirth ?? null),
        formatStudentAccountStatusLabelFr(s.status ?? ''),
        mineurText,
        levelLabel,
        profile?.addressLine1 ?? profile?.addressLegacy ?? '',
        profile?.department ?? '',
        profile?.postalCode ?? '',
        profile?.city ?? '',
        establishmentNames,
        matieres,
        disponibilites,
        profile?.medicalNotes ?? '',
        formatExportDate(s.createdAt),
      ];
    });

    return buildXlsxBuffer({
      sheetName: 'Élèves',
      headerRow: STUDENT_EXPORT_HEADERS,
      dataRows: rows,
    });
  }

  /**
   * Export generic users as Excel (tutors / volunteers).
   * We intentionally mirror the same filtering logic as the paginated GET endpoints.
   */
  private async exportUsersCsvForRole(
    companyId: string,
    roleCode: string,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      subjectIds?: string[];
      levelIds?: string[];
      classIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
    },
  ): Promise<Buffer> {
    const headerRow = [
      'Email',
      'Téléphone',
      'Statut',
      'Nom Affiché',
      'Genre',
      'Date De Naissance',
      'Mineur',
      'Niveau',
      'Établissements',
      'Date Création',
    ];

    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('UPPER(role.code) = :code', { code: roleCode.toUpperCase() })
      .getMany();

    if (!roles.length) {
      return buildXlsxBuffer({
        sheetName: 'Export',
        headerRow,
        dataRows: [],
      });
    }

    const roleIds = roles.map((r) => r.id);

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('user.userProfiles', 'userProfile')
      .leftJoinAndSelect('userProfile.level', 'level')
      .leftJoinAndSelect('user.userEstablishments', 'userEstablishment')
      .leftJoinAndSelect('userEstablishment.establishment', 'establishment')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('userRole.role_id IN (:...roleIds)', { roleIds })
      .andWhere('user.deleted_at IS NULL');

    if (filters?.search?.trim()) {
      const terms = filters.search.trim().split(/\s+/).filter((t) => t.length > 0);
      if (terms.length === 1) {
        const search = `%${terms[0]}%`;
        query.andWhere(
          '(UNACCENT(user.first_name) ILIKE UNACCENT(:search) OR UNACCENT(user.last_name) ILIKE UNACCENT(:search) OR UNACCENT(user.email) ILIKE UNACCENT(:search) OR UNACCENT(user.display_name) ILIKE UNACCENT(:search))',
          { search },
        );
      } else {
        terms.forEach((term, i) => {
          const paramName = `searchTerm${i}`;
          query.andWhere(
            `(UNACCENT(user.first_name) ILIKE UNACCENT(:${paramName}) OR UNACCENT(user.last_name) ILIKE UNACCENT(:${paramName}))`,
            { [paramName]: `%${term}%` },
          );
        });
      }
    }

    if (filters?.excludeIds?.trim()) {
      const idsToExclude = filters.excludeIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (idsToExclude.length > 0) {
        query.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds: idsToExclude });
      }
    }

    if (filters?.statuses?.length) {
      query.andWhere('user.status IN (:...statuses)', { statuses: filters.statuses });
    }

    if (filters?.dateFrom) {
      query.andWhere('user.created_at >= :dateFrom', { dateFrom: parseLocalDate(filters.dateFrom) });
    }

    if (filters?.dateTo) {
      query.andWhere('user.created_at <= :dateTo', { dateTo: parseLocalDateEndOfDay(filters.dateTo) });
    }

    if (filters?.establishmentId) {
      query.andWhere('userEstablishment.establishment_id = :establishmentId', {
        establishmentId: filters.establishmentId,
      });
    }

    if (filters?.levelIds?.length) {
      query.andWhere('userProfile.level_id IN (:...levelIds)', { levelIds: filters.levelIds });
    }

    if (filters?.classIds?.length) {
      query.andWhere('userProfile.school_class_id IN (:...classIds)', { classIds: filters.classIds });
    }

    if (filters?.subjectIds?.length) {
      appendUserProfileSubjectJsonbFilter(query, filters.subjectIds, { paramSuffix: 'genRoleExport' });
    }

    const hasAvailabilityFilter =
      filters?.availabilityDayOfWeek !== undefined ||
      filters?.availabilityStartTime !== undefined ||
      filters?.availabilityEndTime !== undefined;

    if (hasAvailabilityFilter) {
      if (
        filters?.availabilityDayOfWeek === undefined ||
        !filters?.availabilityStartTime ||
        !filters?.availabilityEndTime
      ) {
        throw new BadRequestException(
          'availabilityDayOfWeek, availabilityStartTime and availabilityEndTime are required together',
        );
      }

      const availabilityUtc = await this.convertAvailabilityToFilter(
        filters.availabilityDayOfWeek,
        filters.availabilityStartTime,
        filters.availabilityEndTime,
      );

      query.andWhere(
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE("userProfile"."availability"->'weekly', '[]'::jsonb)) AS slot
          WHERE (slot->>'day')::int = :availabilityUtcDay
            AND (
              split_part(slot->>'start', ':', 1)::int * 60
              + split_part(slot->>'start', ':', 2)::int
            ) <= :availabilityUtcStartMinutes
            AND (
              split_part(slot->>'end', ':', 1)::int * 60
              + split_part(slot->>'end', ':', 2)::int
            ) >= :availabilityUtcEndMinutes
        )`,
        {
          availabilityUtcDay: availabilityUtc.dayOfWeek,
          availabilityUtcStartMinutes: availabilityUtc.startMinutes,
          availabilityUtcEndMinutes: availabilityUtc.endMinutes,
        },
      );
    }

    query
      .orderBy('user.display_name', 'ASC')
      .addOrderBy('user.first_name', 'ASC')
      .addOrderBy('user.last_name', 'ASC')
      .distinct(true);

    const users = await query.getMany();

    const rows = users.map((s) => {
      const profile = s.userProfiles?.[0];
      const levelLabel = profile?.level?.label ?? '';
      const establishmentNames =
        s.userEstablishments?.map((ue) => ue.establishment?.name).filter(Boolean).join('; ') ?? '';

      return [
        s.email ?? '',
        s.phone ?? '',
        s.status ?? '',
        s.displayName ?? '',
        formatProfileGenderForExport(profile?.gender ?? null),
        formatExportDate(profile?.dateOfBirth ?? null),
        profile?.isMinor != null ? String(profile.isMinor) : '',
        levelLabel,
        establishmentNames,
        formatExportDate(s.createdAt),
      ];
    });

    return buildXlsxBuffer({
      sheetName: 'Export',
      headerRow,
      dataRows: rows,
    });
  }

  async exportTutorsCsv(
    companyId: string,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      levelIds?: string[];
      classIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
      availabilityDays?: number[];
    },
  ): Promise<Buffer> {
    const TUTOR_EXPORT_HEADERS = [
      'Nom',
      'Email',
      'Téléphone',
      'Statut',
      'Établissements',
      'Matières enseignées',
      'Disponibilités',
      'Engagement start date',
      'Engagement end date',
      'Date Création',
    ];

    const DAY_NAMES_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const formatAvailability = (availability: Record<string, unknown> | null | undefined): string => {
      if (!availability || typeof availability !== 'object') return '';
      const weekly = (availability as { weekly?: { day: number; start: string; end: string }[] }).weekly;
      if (!Array.isArray(weekly) || weekly.length === 0) return '';
      return weekly
        .map(
          (slot) =>
            `${DAY_NAMES_FR[slot.day] ?? `Jour ${slot.day}`} ${String(slot.start ?? '').trim()}-${String(slot.end ?? '').trim()}`,
        )
        .join('; ');
    };

    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('role.role_group = :roleGroup', { roleGroup: 'tutors' })
      .getMany();

    if (!roles.length) {
      return buildXlsxBuffer({
        sheetName: 'Tuteurs',
        headerRow: TUTOR_EXPORT_HEADERS,
        dataRows: [],
      });
    }

    const roleIds = roles.map((r) => r.id);

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('user.userProfiles', 'userProfile')
      .leftJoinAndSelect('userProfile.level', 'level')
      .leftJoinAndSelect('user.userEstablishments', 'userEstablishment')
      .leftJoinAndSelect('userEstablishment.establishment', 'establishment')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('userRole.role_id IN (:...roleIds)', { roleIds })
      .andWhere('user.deleted_at IS NULL');

    if (filters?.search?.trim()) {
      const terms = filters.search.trim().split(/\s+/).filter((t) => t.length > 0);
      if (terms.length === 1) {
        const search = `%${terms[0]}%`;
        query.andWhere(
          '(UNACCENT(user.first_name) ILIKE UNACCENT(:search) OR UNACCENT(user.last_name) ILIKE UNACCENT(:search) OR UNACCENT(user.email) ILIKE UNACCENT(:search) OR UNACCENT(user.display_name) ILIKE UNACCENT(:search))',
          { search },
        );
      } else {
        terms.forEach((term, i) => {
          const paramName = `searchTerm${i}`;
          query.andWhere(
            `(UNACCENT(user.first_name) ILIKE UNACCENT(:${paramName}) OR UNACCENT(user.last_name) ILIKE UNACCENT(:${paramName}))`,
            { [paramName]: `%${term}%` },
          );
        });
      }
    }

    if (filters?.excludeIds?.trim()) {
      const idsToExclude = filters.excludeIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (idsToExclude.length > 0) {
        query.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds: idsToExclude });
      }
    }

    if (filters?.statuses?.length) {
      query.andWhere('user.status IN (:...statuses)', { statuses: filters.statuses });
    }

    if (filters?.dateFrom) {
      query.andWhere('user.created_at >= :dateFrom', { dateFrom: parseLocalDate(filters.dateFrom) });
    }

    if (filters?.dateTo) {
      query.andWhere('user.created_at <= :dateTo', { dateTo: parseLocalDateEndOfDay(filters.dateTo) });
    }

    const exportEstablishmentIds =
      filters?.establishmentIds?.length
        ? filters.establishmentIds
        : filters?.establishmentId
          ? [filters.establishmentId]
          : undefined;

    if (exportEstablishmentIds?.length) {
      query.andWhere('userEstablishment.establishment_id IN (:...establishmentIds)', {
        establishmentIds: exportEstablishmentIds,
      });
    }

    if (filters?.levelIds?.length) {
      query.andWhere('userProfile.level_id IN (:...levelIds)', { levelIds: filters.levelIds });
    }

    if (filters?.classIds?.length) {
      query.andWhere('userProfile.school_class_id IN (:...classIds)', { classIds: filters.classIds });
    }

    if (filters?.subjectIds?.length) {
      appendUserProfileSubjectJsonbFilter(query, filters.subjectIds, { paramSuffix: 'tutorXlsx' });
    }

    const hasAvailabilityFilter =
      filters?.availabilityDayOfWeek !== undefined ||
      filters?.availabilityStartTime !== undefined ||
      filters?.availabilityEndTime !== undefined;

    if (hasAvailabilityFilter) {
      if (
        filters?.availabilityDayOfWeek === undefined ||
        !filters?.availabilityStartTime ||
        !filters?.availabilityEndTime
      ) {
        throw new BadRequestException(
          'availabilityDayOfWeek, availabilityStartTime and availabilityEndTime are required together',
        );
      }

      const availabilityUtc = await this.convertAvailabilityToFilter(
        filters.availabilityDayOfWeek,
        filters.availabilityStartTime,
        filters.availabilityEndTime,
      );

      query.andWhere(
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE("userProfile"."availability"->'weekly', '[]'::jsonb)) AS slot
          WHERE (slot->>'day')::int = :availabilityUtcDay
            AND (
              split_part(slot->>'start', ':', 1)::int * 60
              + split_part(slot->>'start', ':', 2)::int
            ) <= :availabilityUtcStartMinutes
            AND (
              split_part(slot->>'end', ':', 1)::int * 60
              + split_part(slot->>'end', ':', 2)::int
            ) >= :availabilityUtcEndMinutes
        )`,
        {
          availabilityUtcDay: availabilityUtc.dayOfWeek,
          availabilityUtcStartMinutes: availabilityUtc.startMinutes,
          availabilityUtcEndMinutes: availabilityUtc.endMinutes,
        },
      );
    } else if (filters?.availabilityDays?.length) {
      query.andWhere(
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE("userProfile"."availability"->'weekly', '[]'::jsonb)) AS slot_tutor_xlsx_days
          WHERE (slot_tutor_xlsx_days->>'day')::int IN (:...availabilityDayFilterTutorXlsx)
        )`,
        { availabilityDayFilterTutorXlsx: filters.availabilityDays },
      );
    }

    query
      .orderBy('user.display_name', 'ASC')
      .addOrderBy('user.first_name', 'ASC')
      .addOrderBy('user.last_name', 'ASC')
      .distinct(true);

    const tutors = await query.getMany();

    if (tutors.length === 0) {
      return buildXlsxBuffer({
        sheetName: 'Tuteurs',
        headerRow: TUTOR_EXPORT_HEADERS,
        dataRows: [],
      });
    }

    const allSubjectIds = new Set<string>();
    for (const st of tutors) {
      const stProfile = st.userProfiles?.[0];
      if (!Array.isArray(stProfile?.subjectNames) || !stProfile.subjectNames.length) {
        (stProfile?.subjects ?? []).forEach((sub: unknown) => {
          const id = typeof sub === 'string'
            ? sub
            : (sub && typeof sub === 'object' && 'id' in sub ? String((sub as { id: unknown }).id) : null);
          if (id) allSubjectIds.add(id);
        });
      }
    }
    const subjectLabelMap = new Map<string, string>();
    if (allSubjectIds.size > 0) {
      const subjectEntities = await this.subjectRepository.findBy({ id: In([...allSubjectIds]) });
      subjectEntities.forEach((sub) => subjectLabelMap.set(sub.id, sub.label));
    }

    const rows = tutors.map((s) => {
      const profile = s.userProfiles?.[0];
      const establishmentNames =
        s.userEstablishments?.map((ue) => ue.establishment?.name).filter(Boolean).join('; ') ?? '';

      let matieres = '';
      if (Array.isArray(profile?.subjectNames) && profile.subjectNames.length > 0) {
        matieres = profile.subjectNames.join('; ');
      } else if (Array.isArray(profile?.subjects) && profile.subjects.length > 0) {
        matieres = profile.subjects
          .map((sub: unknown) => {
            const id = typeof sub === 'string'
              ? sub
              : (sub && typeof sub === 'object' && 'id' in sub ? String((sub as { id: unknown }).id) : null);
            return id ? (subjectLabelMap.get(id) ?? '') : '';
          })
          .filter(Boolean)
          .join('; ');
      }

      const disponibilites = formatAvailability(profile?.availability);

      return [
        s.displayName ?? '',
        s.email ?? '',
        s.phone ?? '',
        s.status ?? '',
        establishmentNames,
        matieres,
        disponibilites,
        formatExportDate(profile?.engagementStartDate ?? null),
        formatExportDate(profile?.engagementEndDate ?? null),
        formatExportDate(s.createdAt),
      ];
    });

    return buildXlsxBuffer({
      sheetName: 'Tuteurs',
      headerRow: TUTOR_EXPORT_HEADERS,
      dataRows: rows,
    });
  }

  async exportVolunteersCsv(
    companyId: string,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      levelIds?: string[];
      classIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
      availabilityDays?: number[];
      vscFrequencies?: ('daily' | 'weekly')[];
    },
  ): Promise<Buffer> {
    const VOLUNTEER_EXPORT_HEADERS = [
      'Nom',
      'Email',
      'Téléphone',
      'Statut',
      'Établissements',
      'Matières enseignées',
      'Disponibilités',
      'Géré par (Coordinateur)',
      'Configuration des rapports VSC',
      'Engagement start date',
      'Engagement end date',
      'Date Création',
    ];

    const DAY_NAMES_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const formatVscReports = (
      freq: { daily?: boolean; weekly?: boolean } | null | undefined,
    ): string => {
      if (!freq) return '';
      const parts: string[] = [];
      if (freq.daily) parts.push('Quotidien');
      if (freq.weekly) parts.push('Hebdomadaire');
      return parts.join('; ');
    };

    const formatAvailability = (availability: Record<string, unknown> | null | undefined): string => {
      if (!availability || typeof availability !== 'object') return '';
      const weekly = (availability as { weekly?: { day: number; start: string; end: string }[] }).weekly;
      if (!Array.isArray(weekly) || weekly.length === 0) return '';
      return weekly
        .map(
          (slot) =>
            `${DAY_NAMES_FR[slot.day] ?? `Jour ${slot.day}`} ${String(slot.start ?? '').trim()}-${String(slot.end ?? '').trim()}`,
        )
        .join('; ');
    };

    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('UPPER(role.code) = :code', { code: 'VOLUNTEER' })
      .getMany();

    if (!roles.length) {
      return buildXlsxBuffer({
        sheetName: 'Bénévoles',
        headerRow: VOLUNTEER_EXPORT_HEADERS,
        dataRows: [],
      });
    }

    const roleIds = roles.map((r) => r.id);

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('user.userProfiles', 'userProfile')
      .leftJoinAndSelect('userProfile.level', 'level')
      .leftJoinAndSelect('user.userEstablishments', 'userEstablishment')
      .leftJoinAndSelect('userEstablishment.establishment', 'establishment')
      .leftJoinAndSelect('user.managedBy', 'managedByUser')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('userRole.role_id IN (:...roleIds)', { roleIds })
      .andWhere('user.deleted_at IS NULL');

    if (filters?.search?.trim()) {
      const terms = filters.search.trim().split(/\s+/).filter((t) => t.length > 0);
      if (terms.length === 1) {
        const search = `%${terms[0]}%`;
        query.andWhere(
          '(UNACCENT(user.first_name) ILIKE UNACCENT(:search) OR UNACCENT(user.last_name) ILIKE UNACCENT(:search) OR UNACCENT(user.email) ILIKE UNACCENT(:search) OR UNACCENT(user.display_name) ILIKE UNACCENT(:search))',
          { search },
        );
      } else {
        terms.forEach((term, i) => {
          const paramName = `searchTerm${i}`;
          query.andWhere(
            `(UNACCENT(user.first_name) ILIKE UNACCENT(:${paramName}) OR UNACCENT(user.last_name) ILIKE UNACCENT(:${paramName}))`,
            { [paramName]: `%${term}%` },
          );
        });
      }
    }

    if (filters?.excludeIds?.trim()) {
      const idsToExclude = filters.excludeIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (idsToExclude.length > 0) {
        query.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds: idsToExclude });
      }
    }

    if (filters?.statuses?.length) {
      query.andWhere('user.status IN (:...statuses)', { statuses: filters.statuses });
    }

    if (filters?.dateFrom) {
      query.andWhere('user.created_at >= :dateFrom', { dateFrom: parseLocalDate(filters.dateFrom) });
    }

    if (filters?.dateTo) {
      query.andWhere('user.created_at <= :dateTo', { dateTo: parseLocalDateEndOfDay(filters.dateTo) });
    }

    const exportEstablishmentIds =
      filters?.establishmentIds?.length
        ? filters.establishmentIds
        : filters?.establishmentId
          ? [filters.establishmentId]
          : undefined;

    if (exportEstablishmentIds?.length) {
      query.andWhere('userEstablishment.establishment_id IN (:...establishmentIds)', {
        establishmentIds: exportEstablishmentIds,
      });
    }

    if (filters?.levelIds?.length) {
      query.andWhere('userProfile.level_id IN (:...levelIds)', { levelIds: filters.levelIds });
    }

    if (filters?.classIds?.length) {
      query.andWhere('userProfile.school_class_id IN (:...classIds)', { classIds: filters.classIds });
    }

    if (filters?.subjectIds?.length) {
      appendUserProfileSubjectJsonbFilter(query, filters.subjectIds, { paramSuffix: 'volunteerXlsx' });
    }

    const hasAvailabilityFilter =
      filters?.availabilityDayOfWeek !== undefined ||
      filters?.availabilityStartTime !== undefined ||
      filters?.availabilityEndTime !== undefined;

    if (hasAvailabilityFilter) {
      if (
        filters?.availabilityDayOfWeek === undefined ||
        !filters?.availabilityStartTime ||
        !filters?.availabilityEndTime
      ) {
        throw new BadRequestException(
          'availabilityDayOfWeek, availabilityStartTime and availabilityEndTime are required together',
        );
      }

      const availabilityUtc = await this.convertAvailabilityToFilter(
        filters.availabilityDayOfWeek,
        filters.availabilityStartTime,
        filters.availabilityEndTime,
      );

      query.andWhere(
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE("userProfile"."availability"->'weekly', '[]'::jsonb)) AS slot
          WHERE (slot->>'day')::int = :availabilityUtcDay
            AND (
              split_part(slot->>'start', ':', 1)::int * 60
              + split_part(slot->>'start', ':', 2)::int
            ) <= :availabilityUtcStartMinutes
            AND (
              split_part(slot->>'end', ':', 1)::int * 60
              + split_part(slot->>'end', ':', 2)::int
            ) >= :availabilityUtcEndMinutes
        )`,
        {
          availabilityUtcDay: availabilityUtc.dayOfWeek,
          availabilityUtcStartMinutes: availabilityUtc.startMinutes,
          availabilityUtcEndMinutes: availabilityUtc.endMinutes,
        },
      );
    } else if (filters?.availabilityDays?.length) {
      query.andWhere(
        `EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE("userProfile"."availability"->'weekly', '[]'::jsonb)) AS slot_vol_xlsx_days
          WHERE (slot_vol_xlsx_days->>'day')::int IN (:...availabilityDayFilterVolXlsx)
        )`,
        { availabilityDayFilterVolXlsx: filters.availabilityDays },
      );
    }

    if (filters?.vscFrequencies?.length) {
      const vscIncDaily = filters.vscFrequencies.includes('daily');
      const vscIncWeekly = filters.vscFrequencies.includes('weekly');
      query.andWhere(
        `(
          (:vscVolXlsxDaily = true AND COALESCE(("userProfile"."vsc_reports_frequencies"->>'daily')::boolean, false) = true)
          OR
          (:vscVolXlsxWeekly = true AND COALESCE(("userProfile"."vsc_reports_frequencies"->>'weekly')::boolean, false) = true)
        )`,
        { vscVolXlsxDaily: vscIncDaily, vscVolXlsxWeekly: vscIncWeekly },
      );
    }

    query
      .orderBy('user.display_name', 'ASC')
      .addOrderBy('user.first_name', 'ASC')
      .addOrderBy('user.last_name', 'ASC')
      .distinct(true);

    const volunteers = await query.getMany();

    if (volunteers.length === 0) {
      return buildXlsxBuffer({
        sheetName: 'Bénévoles',
        headerRow: VOLUNTEER_EXPORT_HEADERS,
        dataRows: [],
      });
    }

    const allSubjectIds = new Set<string>();
    for (const st of volunteers) {
      const stProfile = st.userProfiles?.[0];
      if (!Array.isArray(stProfile?.subjectNames) || !stProfile.subjectNames.length) {
        (stProfile?.subjects ?? []).forEach((sub: unknown) => {
          const id = typeof sub === 'string'
            ? sub
            : (sub && typeof sub === 'object' && 'id' in sub ? String((sub as { id: unknown }).id) : null);
          if (id) allSubjectIds.add(id);
        });
      }
    }
    const subjectLabelMap = new Map<string, string>();
    if (allSubjectIds.size > 0) {
      const subjectEntities = await this.subjectRepository.findBy({ id: In([...allSubjectIds]) });
      subjectEntities.forEach((sub) => subjectLabelMap.set(sub.id, sub.label));
    }

    const rows = volunteers.map((s) => {
      const profile = s.userProfiles?.[0];
      const establishmentNames =
        s.userEstablishments?.map((ue) => ue.establishment?.name).filter(Boolean).join('; ') ?? '';

      let matieres = '';
      if (Array.isArray(profile?.subjectNames) && profile.subjectNames.length > 0) {
        matieres = profile.subjectNames.join('; ');
      } else if (Array.isArray(profile?.subjects) && profile.subjects.length > 0) {
        matieres = profile.subjects
          .map((sub: unknown) => {
            const id = typeof sub === 'string'
              ? sub
              : (sub && typeof sub === 'object' && 'id' in sub ? String((sub as { id: unknown }).id) : null);
            return id ? (subjectLabelMap.get(id) ?? '') : '';
          })
          .filter(Boolean)
          .join('; ');
      }

      const disponibilites = formatAvailability(profile?.availability);

      const coord = s.managedBy;
      let coordinateur = '';
      if (coord) {
        const dn = coord.displayName?.trim();
        if (dn) coordinateur = dn;
        else {
          const full = `${coord.firstName ?? ''} ${coord.lastName ?? ''}`.trim();
          if (full) coordinateur = full;
          else coordinateur = coord.email ?? '';
        }
      }

      return [
        s.displayName ?? '',
        s.email ?? '',
        s.phone ?? '',
        s.status ?? '',
        establishmentNames,
        matieres,
        disponibilites,
        coordinateur,
        formatVscReports(profile?.vscReportsFrequencies),
        formatExportDate(profile?.engagementStartDate ?? null),
        formatExportDate(profile?.engagementEndDate ?? null),
        formatExportDate(s.createdAt),
      ];
    });

    return buildXlsxBuffer({
      sheetName: 'Bénévoles',
      headerRow: VOLUNTEER_EXPORT_HEADERS,
      dataRows: rows,
    });
  }

  // Tutors (all roles in 'tutors' group)
  async findTutors(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      classIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
      availabilityDays?: number[];
      roleCodes?: string[];
      engagementStartDateFrom?: string;
      engagementStartDateTo?: string;
      tutorExitDateFrom?: string;
      tutorExitDateTo?: string;
      tutorExitReason?: string;
    },
    visibilityScope?: VisibilityScope | null,
    currentUserId?: string,
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    const result = await this.findUsersInRoleGroupWithVisibility(
      companyId,
      'tutors',
      'tutors',
      page,
      pageSize,
      filters,
      visibilityScope,
      currentUserId,
      filters?.roleCodes,
    );

    await this.attachTutorHoursDone(companyId, result.data, 'tutor');
    await this.attachAttendanceRate(companyId, result.data, 'tutor');

    return result;
  }

  async findTutor(identifier: string, companyId: string): Promise<User> {
    const tutorRoleCodes = await this.getRoleCodesByGroup(companyId, 'tutors');
    return this.findUserByIdentifier(identifier, companyId, tutorRoleCodes, 'Tutor');
  }

  // Students
  async findStudents(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      levelIds?: string[];
      classIds?: string[];
      specialtyIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
      isMinor?: boolean;
      hasSpecialNeeds?: boolean;
      exitDateFrom?: string;
      exitDateTo?: string;
      exitReason?: string;
    },
    visibilityScope?: VisibilityScope | null,
    currentUserId?: string,
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    const scopeUser = currentUserId ? { userId: currentUserId, companyId } : undefined;

    // Build exit-date / exit-reason filter
    // - exit_date is queried from user_profiles (dedicated column, set when deactivated)
    // - exit_reason is queried from student_status_history
    // Both restrict to currently-deactivated students only.
    let exitFilteredIds: string[] | undefined;
    if (filters?.exitDateFrom || filters?.exitDateTo || filters?.exitReason) {
      let dateIds: string[] | undefined;
      let reasonIds: string[] | undefined;

      if (filters.exitDateFrom || filters.exitDateTo) {
        const qb = this.userProfileRepository
          .createQueryBuilder('up')
          .select('up.user_id', 'userId')
          .innerJoin('users', 'u', 'u.id = up.user_id AND u.status = :us', { us: 'deactivated' })
          .where('up.exit_date IS NOT NULL');
        if (filters.exitDateFrom) {
          qb.andWhere('up.exit_date >= :exitFrom', { exitFrom: parseLocalDate(filters.exitDateFrom) });
        }
        if (filters.exitDateTo) {
          qb.andWhere('up.exit_date <= :exitTo', { exitTo: parseLocalDateEndOfDay(filters.exitDateTo) });
        }
        const rows = await qb.getRawMany<{ userId: string }>();
        dateIds = rows.map((r) => r.userId).filter(Boolean);
        if (dateIds.length === 0) return { data: [], total: 0, page, pageSize };
      }

      if (filters.exitReason) {
        const qb = this.studentStatusHistoryRepository
          .createQueryBuilder('ssh')
          .select('ssh.student_user_id', 'userId')
          .innerJoin('users', 'u', 'u.id = ssh.student_user_id AND u.status = :us', { us: 'deactivated' })
          .where('ssh.new_status = :ns', { ns: 'deactivated' })
          .andWhere('ssh.reason = :exitReason', { exitReason: filters.exitReason });
        const rows = await qb.getRawMany<{ userId: string }>();
        reasonIds = rows.map((r) => r.userId).filter(Boolean);
        if (reasonIds.length === 0) return { data: [], total: 0, page, pageSize };
      }

      if (dateIds && reasonIds) {
        const dateSet = new Set(dateIds);
        exitFilteredIds = reasonIds.filter((uid) => dateSet.has(uid));
      } else {
        exitFilteredIds = dateIds ?? reasonIds;
      }

      if (!exitFilteredIds || exitFilteredIds.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
    }

    const result = await this.findUsersByRoleCodes(
      companyId,
      ['STUDENT'],
      page,
      pageSize,
      {
        ...filters,
        ...(exitFilteredIds ? { restrictToUserIds: exitFilteredIds } : {}),
      },
      visibilityScope,
      scopeUser,
    );

    if (result.data.length === 0) return result;

    // Batch enrich: deactivation info + presence rate
    const userIds = result.data.map((u) => u.id);

    // Deactivation reason + created_at fallback (exit_date from user_profiles; created_at as fallback for legacy rows)
    const deactivationRows = await this.studentStatusHistoryRepository
      .createQueryBuilder('ssh')
      .select('ssh.student_user_id', 'userId')
      .addSelect(
        `(SELECT ssh2.reason FROM student_status_history ssh2 WHERE ssh2.student_user_id = ssh.student_user_id AND ssh2.new_status = 'deactivated' ORDER BY ssh2.created_at DESC LIMIT 1)`,
        'deactivationReason',
      )
      .addSelect(
        `(SELECT ssh2.reason_note FROM student_status_history ssh2 WHERE ssh2.student_user_id = ssh.student_user_id AND ssh2.new_status = 'deactivated' ORDER BY ssh2.created_at DESC LIMIT 1)`,
        'deactivationReasonNote',
      )
      .addSelect(
        `(SELECT ssh2.created_at FROM student_status_history ssh2 WHERE ssh2.student_user_id = ssh.student_user_id AND ssh2.new_status = 'deactivated' ORDER BY ssh2.created_at DESC LIMIT 1)`,
        'deactivationCreatedAt',
      )
      .where('ssh.student_user_id IN (:...userIds)', { userIds })
      .andWhere('ssh.new_status = :ns', { ns: 'deactivated' })
      .groupBy('ssh.student_user_id')
      .getRawMany<{
        userId: string;
        deactivationReason: string | null;
        deactivationReasonNote: string | null;
        deactivationCreatedAt: string | null;
      }>();

    const deactivationMap = new Map(deactivationRows.map((r) => [r.userId, r]));

    // Taux de présence = (TERMINÉES + CLÔTURÉES avec présence=présent) / (TERMINÉES + CLÔTURÉES total) × 100
    // COMPLETED (terminées)  : toutes les participations comptent comme présent (pas de saisie formelle)
    // CLOSED    (clôturées)  : seules les participations avec attendance_status = 'present' comptent
    const presenceRows = await this.sessionParticipantRepository
      .createQueryBuilder('sp')
      .innerJoin('sp.session', 'sess')
      .select('sp.user_id', 'userId')
      .addSelect(
        `COUNT(*) FILTER (WHERE sess.status IN ('COMPLETED', 'CLOSED'))`,
        'total',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE sess.status = 'COMPLETED' OR (sess.status = 'CLOSED' AND sp.attendance_status = 'present'))`,
        'present',
      )
      .where('sp.user_id IN (:...userIds)', { userIds })
      .andWhere('sp.role = :role', { role: 'student' })
      .groupBy('sp.user_id')
      .getRawMany<{ userId: string; total: string; present: string }>();

    const presenceMap = new Map(presenceRows.map((r) => [r.userId, r]));

    // Attach enriched data to each user
    result.data = result.data.map((u) => {
      const deact = deactivationMap.get(u.id);
      const pres = presenceMap.get(u.id);
      const total = pres ? parseInt(pres.total, 10) : 0;
      const present = pres ? parseInt(pres.present, 10) : 0;
      const isCurrentlyDeactivated = u.status === 'deactivated';
      const exitDate =
        u.userProfiles?.[0]?.exitDate ??
        (deact?.deactivationCreatedAt ? new Date(deact.deactivationCreatedAt) : null);
      return Object.assign(u, {
        deactivationDate: isCurrentlyDeactivated ? exitDate : null,
        deactivationReason: isCurrentlyDeactivated ? (deact?.deactivationReason ?? null) : null,
        deactivationReasonNote: isCurrentlyDeactivated
          ? (deact?.deactivationReasonNote ?? null)
          : null,
        presenceRate: total > 0 ? Math.round((present / total) * 100) : null,
      });
    });

    return result;
  }

  private async collectStudentUserIdsInSharedEstablishments(
    companyId: string,
    volunteerUserId: string,
    establishmentFilterIds?: string[],
  ): Promise<string[]> {
    const volunteerEstablishments = await this.userEstablishmentRepository
      .createQueryBuilder('ue')
      .select('ue.establishmentId', 'establishmentId')
      .where('ue.companyId = :companyId', { companyId })
      .andWhere('ue.userId = :userId', { userId: volunteerUserId })
      .getRawMany<{ establishmentId: string }>();

    const volunteerEstablishmentIds = volunteerEstablishments
      .map((r) => r.establishmentId)
      .filter(Boolean);

    let effectiveEstablishmentIds = volunteerEstablishmentIds;
    if (establishmentFilterIds?.length) {
      const allowed = new Set(volunteerEstablishmentIds);
      effectiveEstablishmentIds = establishmentFilterIds.filter((id) => allowed.has(id));
    }

    const uniqueEstablishmentIds = Array.from(new Set(effectiveEstablishmentIds));
    if (!uniqueEstablishmentIds.length) return [];

    const studentUsersInEstablishments = await this.userEstablishmentRepository
      .createQueryBuilder('ue')
      .select('ue.userId', 'userId')
      .where('ue.companyId = :companyId', { companyId })
      .andWhere('ue.establishmentId IN (:...establishmentIds)', {
        establishmentIds: uniqueEstablishmentIds,
      })
      .distinct(true)
      .getRawMany<{ userId: string }>();

    return studentUsersInEstablishments.map((r) => r.userId).filter(Boolean);
  }

  /**
   * Volunteer-visible students: students who share at least one establishment with the volunteer
   * through user_establishments (optionally intersected with establishment filters).
   */
  async findStudentsForVolunteerByEstablishments(
    companyId: string,
    volunteerUserId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      levelIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
      isMinor?: boolean;
      hasSpecialNeeds?: boolean;
      classIds?: string[];
    },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    const establishmentIds =
      filters?.establishmentIds?.length
        ? filters.establishmentIds
        : filters?.establishmentId
          ? [filters.establishmentId]
          : undefined;

    const allowedStudentIds = await this.collectStudentUserIdsInSharedEstablishments(
      companyId,
      volunteerUserId,
      establishmentIds,
    );
    if (!allowedStudentIds.length) {
      return createPaginatedResponse([], 0, page, pageSize);
    }

    const scopeUser = { userId: volunteerUserId, companyId };
    return this.findUsersByRoleCodes(companyId, ['STUDENT'], page, pageSize, {
      ...filters,
      restrictToUserIds: allowedStudentIds,
    }, undefined, scopeUser, actionScopes, 'students');
  }

  /**
   * Student user IDs a tutor/volunteer is linked to in this company: session pairs, core pairs,
   * same-session co-participants only when pairs are missing (see below), students under managed_by,
   * and students on sessions where the user is session.managed_by.
   *
   * Co-participant fallback: all students on the same session were previously included whenever the
   * tutor was a participant, which wrongly mixed groups when several tutors share one session. That
   * fallback now applies only to sessions with exactly one tutor/volunteer participant so multi-group
   * sessions rely on session_student_tutor_pairs (and other branches) only.
   */
  private async collectStudentIdsLinkedToTutor(
    companyId: string,
    tutorUserId: string,
    establishmentIds?: string[],
  ): Promise<string[]> {
    const ids = new Set<string>();
    const tutorRoles = ['tutor', 'volunteer'] as const;

    const singleTutorSessionSubQb = this.sessionParticipantRepository
      .createQueryBuilder('sp_mono')
      .select('sp_mono.sessionId', 'sessionId')
      .where('sp_mono.role IN (:...tutorRolesMono)', { tutorRolesMono: [...tutorRoles] })
      .groupBy('sp_mono.sessionId')
      .having('COUNT(DISTINCT sp_mono.userId) = 1');
    const singleTutorSessionSql = singleTutorSessionSubQb.getQuery();
    const singleTutorSessionParams = singleTutorSessionSubQb.getParameters();

    const pairRows = await this.sessionStudentTutorPairRepository
      .createQueryBuilder('p')
      .innerJoin('p.session', 's')
      .select('p.studentUserId', 'id')
      .where('p.tutorUserId = :tutorUserId', { tutorUserId })
      .andWhere('s.companyId = :companyId', { companyId })
      .andWhere(establishmentIds?.length ? 's.establishmentId IN (:...establishmentIds)' : '1=1', {
        establishmentIds: establishmentIds ?? [],
      })
      .andWhere('s.deletedAt IS NULL')
      .getRawMany();
    pairRows.forEach((r: { id?: string }) => {
      if (r.id) ids.add(r.id);
    });

    const coreRows = await this.binomeCoeurRepository
      .createQueryBuilder('b')
      .select('b.studentUserId', 'id')
      .where('b.companyId = :companyId', { companyId })
      .andWhere('b.tutorUserId = :tutorUserId', { tutorUserId })
      .getRawMany();
    coreRows.forEach((r: { id?: string }) => {
      if (r.id) ids.add(r.id);
    });

    const coRows = await this.sessionParticipantRepository
      .createQueryBuilder('tut')
      .innerJoin('tut.session', 's')
      .innerJoin(
        `(${singleTutorSessionSql})`,
        'mono_tutor_sess',
        'mono_tutor_sess."sessionId" = tut.sessionId',
      )
      .innerJoin(
        SessionParticipant,
        'stu',
        'stu.sessionId = tut.sessionId AND stu.role = :studentRole',
        { studentRole: 'student' },
      )
      .select('stu.userId', 'id')
      .where('tut.userId = :tutorUserId', { tutorUserId })
      .andWhere('tut.role IN (:...tutorRoles)', { tutorRoles: [...tutorRoles] })
      .andWhere('s.companyId = :companyId', { companyId })
      .andWhere(establishmentIds?.length ? 's.establishmentId IN (:...establishmentIds)' : '1=1', {
        establishmentIds: establishmentIds ?? [],
      })
      .andWhere('s.deletedAt IS NULL')
      .setParameters(singleTutorSessionParams)
      .getRawMany();
    coRows.forEach((r: { id?: string }) => {
      if (r.id) ids.add(r.id);
    });

    const managedSessionRows = await this.sessionParticipantRepository
      .createQueryBuilder('stu')
      .innerJoin('stu.session', 's')
      .innerJoin(
        `(${singleTutorSessionSql})`,
        'mono_tutor_sess_m',
        'mono_tutor_sess_m."sessionId" = stu.sessionId',
      )
      .select('stu.userId', 'id')
      .where('s.managedById = :tutorUserId', { tutorUserId })
      .andWhere('s.companyId = :companyId', { companyId })
      .andWhere(establishmentIds?.length ? 's.establishmentId IN (:...establishmentIds)' : '1=1', {
        establishmentIds: establishmentIds ?? [],
      })
      .andWhere('s.deletedAt IS NULL')
      .andWhere('stu.role = :studentRole', { studentRole: 'student' })
      .setParameters(singleTutorSessionParams)
      .getRawMany();
    managedSessionRows.forEach((r: { id?: string }) => {
      if (r.id) ids.add(r.id);
    });

    const managedByRows = await this.userRepository
      .createQueryBuilder('u')
      .innerJoin('u.userRoles', 'ur')
      .innerJoin('ur.role', 'role')
      .select('u.id', 'id')
      .where('u.companyId = :companyId', { companyId })
      .andWhere('u.managedById = :tutorUserId', { tutorUserId })
      .andWhere('UPPER(role.code) = :code', { code: 'STUDENT' })
      .getRawMany();
    managedByRows.forEach((r: { id?: string }) => {
      if (r.id) ids.add(r.id);
    });

    return Array.from(ids);
  }

  /**
   * Paginated students for a tutor/volunteer (not staff): only students linked via assignments/sessions.
   */
  async findStudentsForTutor(
    companyId: string,
    tutorUserId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      levelIds?: string[];
      classIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
      isMinor?: boolean;
      hasSpecialNeeds?: boolean;
    },
    visibilityScope?: VisibilityScope | null,
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    const establishmentIds =
      filters?.establishmentIds?.length
        ? filters.establishmentIds
        : filters?.establishmentId
          ? [filters.establishmentId]
          : undefined;

    const linkedIds = await this.collectStudentIdsLinkedToTutor(companyId, tutorUserId, establishmentIds);
    if (!linkedIds.length) {
      return createPaginatedResponse([], 0, page, pageSize);
    }
    const scopeUser = { userId: tutorUserId, companyId };
    return this.findUsersByRoleCodes(companyId, ['STUDENT'], page, pageSize, {
      ...filters,
      restrictToUserIds: linkedIds,
    }, visibilityScope, scopeUser, actionScopes, 'students');
  }

  async findStudent(identifier: string, companyId: string): Promise<User> {
    return this.findUserByIdentifier(identifier, companyId, ['STUDENT'], 'Student');
  }

  // Volunteers (volunteer role)
  async findVolunteers(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      establishmentId?: string;
      establishmentIds?: string[];
      subjectIds?: string[];
      levelIds?: string[];
      classIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      availabilityDayOfWeek?: number;
      availabilityStartTime?: string;
      availabilityEndTime?: string;
      availabilityDays?: number[];
      vscFrequencies?: ('daily' | 'weekly')[];
      roleCodes?: string[];
      engagementStartDateFrom?: string;
      engagementStartDateTo?: string;
      tutorExitDateFrom?: string;
      tutorExitDateTo?: string;
      tutorExitReason?: string;
    },
    visibilityScope?: VisibilityScope | null,
    currentUserId?: string,
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    const result = await this.findUsersInRoleGroupWithVisibility(
      companyId,
      'volunteers',
      'volunteers',
      page,
      pageSize,
      filters,
      visibilityScope,
      currentUserId,
      filters?.roleCodes,
    );

    await this.attachTutorHoursDone(companyId, result.data, 'volunteer');
    await this.attachAttendanceRate(companyId, result.data, 'volunteer');

    return result;
  }

  async findVolunteer(identifier: string, companyId: string): Promise<User> {
    const volunteerRoleCodes = await this.getRoleCodesByGroup(companyId, 'volunteers');
    return this.findUserByIdentifier(identifier, companyId, volunteerRoleCodes, 'Volunteer');
  }

  /** Split comma-separated entries (?roleCodes=admin,recruiter or one CSV string). */
  private normalizeRoleCodesFilter(roleCodes?: string[]): string[] {
    if (!roleCodes?.length) return [];
    const out: string[] = [];
    for (const raw of roleCodes) {
      for (const part of String(raw).split(',')) {
        const t = part.trim();
        if (t) out.push(t);
      }
    }
    return out;
  }

  // Admins (admin, manager, coordinator roles combined); optional filter includes recruiter via roleCodes query.
  async findAdmins(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      search?: string;
      excludeIds?: string;
      statuses?: string[];
      dateFrom?: string;
      dateTo?: string;
      roleCodes?: string[];
    },
    visibilityScope?: VisibilityScope | null,
    currentUserUid?: string,
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    return this.findUsersInRoleGroupWithVisibility(
      companyId,
      'admins',
      'admins',
      page,
      pageSize,
      filters,
      visibilityScope,
      currentUserUid,
      filters?.roleCodes,
    );
  }

  async findAdmin(identifier: string, companyId: string): Promise<User> {
    return this.findUserByIdentifier(identifier, companyId, ['ADMIN', 'MANAGER', 'COORDINATOR', 'RECRUITER'], 'Admin');
  }

  // Managers
  async findManagers(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: { search?: string; excludeIds?: string },
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    return this.findUsersByRoleCodes(companyId, ['MANAGER'], page, pageSize, filters, visibilityScope, scopeUser, actionScopes, 'admins');
  }

  async findManager(identifier: string, companyId: string): Promise<User> {
    return this.findUserByIdentifier(identifier, companyId, ['MANAGER'], 'Manager');
  }

  // Coordinators
  async findCoordinators(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: { search?: string; excludeIds?: string; managedById?: string },
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    return this.findUsersByRoleCodes(companyId, ['COORDINATOR'], page, pageSize, {
      ...filters,
      managedByUserId: filters?.managedById,
    }, visibilityScope, scopeUser, actionScopes, 'admins');
  }

  async findCoordinator(identifier: string, companyId: string): Promise<User> {
    return this.findUserByIdentifier(identifier, companyId, ['COORDINATOR'], 'Coordinator');
  }

  // Superadmins (admin role only)
  async findSuperadmins(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: { search?: string; excludeIds?: string },
    visibilityScope?: VisibilityScope | null,
    scopeUser?: { userId: string; companyId: string },
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<User>> {
    return this.findUsersByRoleCodes(companyId, ['ADMIN'], page, pageSize, filters, visibilityScope, scopeUser, actionScopes, 'admins');
  }

  async findSuperadmin(identifier: string, companyId: string): Promise<User> {
    return this.findUserByIdentifier(identifier, companyId, ['ADMIN'], 'Superadmin');
  }

  /**
   * Find users for post-it sharing with role filtering
   * Supports VOLUNTEER, COORDINATOR, MANAGER roles only (excludes STUDENT, ADMIN, etc.)
   */
  async findUsersForSharing(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      search?: string;
      excludeIds?: string;
      roleCodes?: string[];
    },
  ): Promise<PaginatedResponse<User>> {
    // Default to all sharing-compatible roles if not specified
    const defaultRoles = ['VOLUNTEER', 'COORDINATOR', 'MANAGER'];
    const roleCodes = filters?.roleCodes?.length ? filters.roleCodes : defaultRoles;
    
    return this.findUsersByRoleCodes(companyId, roleCodes, page, pageSize, filters);
  }

  async exportAdminsCsv(
    companyId: string,
    filters?: {
      search?: string;
      statuses?: string[];
      roleCodes?: string[];
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<Buffer> {
    const ADMIN_EXPORT_HEADERS = ['Nom Affiché', 'Email', 'Téléphone', 'Rôles', 'Statut', 'Date Création'];

    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.company_id = :companyId', { companyId })
      .andWhere('UPPER(role.code) IN (:...codes)', { codes: ['ADMIN', 'MANAGER', 'COORDINATOR'] })
      .getMany();

    if (!roles.length) {
      return buildXlsxBuffer({ sheetName: 'Admins', headerRow: ADMIN_EXPORT_HEADERS, dataRows: [] });
    }

    let targetRoleIds = roles.map((r) => r.id);
    if (filters?.roleCodes?.length) {
      const upperCodes = filters.roleCodes.map((c) => c.toUpperCase());
      targetRoleIds = roles.filter((r) => upperCodes.includes(r.code.toUpperCase())).map((r) => r.id);
    }

    if (!targetRoleIds.length) {
      return buildXlsxBuffer({ sheetName: 'Admins', headerRow: ADMIN_EXPORT_HEADERS, dataRows: [] });
    }

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('userRole.role_id IN (:...roleIds)', { roleIds: targetRoleIds })
      .andWhere('user.deleted_at IS NULL');

    if (filters?.search?.trim()) {
      const search = `%${filters.search.trim()}%`;
      query.andWhere(
        '(UNACCENT(user.first_name) ILIKE UNACCENT(:search) OR UNACCENT(user.last_name) ILIKE UNACCENT(:search) OR UNACCENT(user.email) ILIKE UNACCENT(:search) OR UNACCENT(user.display_name) ILIKE UNACCENT(:search))',
        { search },
      );
    }

    if (filters?.statuses?.length) {
      query.andWhere('user.status IN (:...statuses)', { statuses: filters.statuses });
    }

    if (filters?.dateFrom) {
      query.andWhere('user.created_at >= :dateFrom', { dateFrom: parseLocalDate(filters.dateFrom) });
    }

    if (filters?.dateTo) {
      query.andWhere('user.created_at <= :dateTo', { dateTo: parseLocalDateEndOfDay(filters.dateTo) });
    }

    query.orderBy('user.display_name', 'ASC').addOrderBy('user.first_name', 'ASC').distinct(true);

    const admins = await query.getMany();

    const rows = admins.map((u) => {
      const roleLabels = u.userRoles
        ?.map((ur) => ur.role?.label ?? ur.role?.code ?? '')
        .filter(Boolean)
        .join('; ') ?? '';
      return [
        u.displayName ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        u.email ?? '',
        u.phone ?? '',
        roleLabels,
        u.status ?? '',
        formatExportDate(u.createdAt),
      ];
    });

    return buildXlsxBuffer({ sheetName: 'Admins', headerRow: ADMIN_EXPORT_HEADERS, dataRows: rows });
  }
}
