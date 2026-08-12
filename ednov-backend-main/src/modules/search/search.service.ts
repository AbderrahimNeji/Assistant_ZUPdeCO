import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import { VisibilityScope } from '../../common/visibility/visibility-scope.types';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';
import {
  GlobalSearchResponseDto,
  UserListItem,
  EstablishmentListItem,
} from './dto/global-search-response.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response';

/**
 * Sidebar menu element IDs used for per-entity scope resolution.
 * Each maps to a searchable entity type in GlobalSearch.
 */
const SEARCH_MENU_ELEMENT_IDS = [
  'menu-tutors',
  'menu-students',
  'menu-admins',
  'menu-volunteers',
  'menu-establishments',
] as const;

@Injectable()
export class SearchService {
  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
  ) {}

  async globalSearch(
    query: GlobalSearchQueryDto,
    user: { uid: string; company_id: string; roles: string[] },
  ): Promise<GlobalSearchResponseDto> {
    const searchTerm = query.q.trim();
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 5, 5);

    const userRolesSet = new Set(user.roles.map((r) => r.toLowerCase()));

    // Tutors with no staff role only see their own linked students.
    // This is a business rule separate from the visibility scope system.
    const isTutorOnly =
      userRolesSet.has('tutor') &&
      !userRolesSet.has('admin') &&
      !userRolesSet.has('manager') &&
      !userRolesSet.has('coordinator') &&
      !userRolesSet.has('volunteer') &&
      !userRolesSet.has('recruiter');

    const allResults: Array<{ type: string; item: UserListItem | EstablishmentListItem }> = [];

    try {
      if (isTutorOnly) {
        const students = await this.searchLinkedStudentsUnpaginated(searchTerm, user.uid, user.company_id);
        students.forEach((item) => allResults.push({ type: 'student', item }));
      } else {
        // Resolve per-entity visibility scopes in one DB query.
        // Key present in map → user has access + scope to apply.
        // Key absent → user has no sidebar access for this entity.
        const scopes = await this.visibilityScopeResolver.resolveMultipleScopes(
          [...SEARCH_MENU_ELEMENT_IDS],
          'sidebar',
          user.roles,
          user.company_id,
        );

        const searches: Promise<void>[] = [];

        if (scopes.has('menu-tutors')) {
          searches.push(
            this.searchTutorsUnpaginated(searchTerm, user.company_id, scopes.get('menu-tutors'), user.uid).then(
              (items) => items.forEach((item) => allResults.push({ type: 'tutor', item })),
            ),
          );
        }

        if (scopes.has('menu-students')) {
          searches.push(
            this.searchStudentsUnpaginated(searchTerm, user.company_id, scopes.get('menu-students'), user.uid).then(
              (items) => items.forEach((item) => allResults.push({ type: 'student', item })),
            ),
          );
        }

        if (scopes.has('menu-volunteers')) {
          searches.push(
            this.searchVolunteersUnpaginated(searchTerm, user.company_id, scopes.get('menu-volunteers'), user.uid).then(
              (items) => items.forEach((item) => allResults.push({ type: 'volunteer', item })),
            ),
          );
        }

        if (scopes.has('menu-admins')) {
          searches.push(
            this.searchAdminsUnpaginated(searchTerm, user.uid, user.company_id, scopes.get('menu-admins')).then(
              (items) => items.forEach((item) => allResults.push({ type: 'admin', item })),
            ),
          );
        }

        if (scopes.has('menu-establishments')) {
          searches.push(
            this.searchEstablishmentsUnpaginated(
              searchTerm,
              user.company_id,
              user.uid,
              scopes.get('menu-establishments'),
            ).then((items) => items.forEach((item) => allResults.push({ type: 'establishment', item }))),
          );
        }

        await Promise.all(searches);
      }
    } catch (error) {
      console.error('Error in globalSearch:', error);
    }

    const totalResults = allResults.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = allResults.slice(startIndex, startIndex + pageSize);

    const tutorsResult: UserListItem[] = [];
    const studentsResult: UserListItem[] = [];
    const volunteersResult: UserListItem[] = [];
    const adminsResult: UserListItem[] = [];
    const establishmentsResult: EstablishmentListItem[] = [];

    paginatedResults.forEach(({ type, item }) => {
      if (type === 'tutor') tutorsResult.push(item as UserListItem);
      else if (type === 'student') studentsResult.push(item as UserListItem);
      else if (type === 'volunteer') volunteersResult.push(item as UserListItem);
      else if (type === 'admin') adminsResult.push(item as UserListItem);
      else if (type === 'establishment') establishmentsResult.push(item as EstablishmentListItem);
    });

    return {
      data: {
        tutors: createPaginatedResponse(tutorsResult, totalResults, page, pageSize),
        students: createPaginatedResponse(studentsResult, totalResults, page, pageSize),
        volunteers: createPaginatedResponse(volunteersResult, totalResults, page, pageSize),
        admins: createPaginatedResponse(adminsResult, totalResults, page, pageSize),
        establishments: createPaginatedResponse(establishmentsResult, totalResults, page, pageSize),
      },
      totalResults,
    };
  }

  private async searchTutorsUnpaginated(
    searchTerm: string,
    companyId: string,
    visibilityScope?: VisibilityScope | null,
    scopeUserId?: string,
  ): Promise<UserListItem[]> {
    try {
      const result = await this.usersService.findTutors(
        companyId,
        1,
        9999,
        { search: searchTerm },
        visibilityScope,
        scopeUserId,
      );
      return result.data.map((user) => this.mapUserToListItem(user, 'tutor'));
    } catch (error) {
      console.error('Error searching tutors:', error);
      return [];
    }
  }

  private async searchStudentsUnpaginated(
    searchTerm: string,
    companyId: string,
    visibilityScope?: VisibilityScope | null,
    scopeUserId?: string,
  ): Promise<UserListItem[]> {
    try {
      const result = await this.usersService.findStudents(
        companyId,
        1,
        9999,
        { search: searchTerm },
        visibilityScope,
        scopeUserId,
      );
      return result.data.map((user) => this.mapUserToListItem(user, 'student'));
    } catch (error) {
      console.error('Error searching students:', error);
      return [];
    }
  }

  private async searchVolunteersUnpaginated(
    searchTerm: string,
    companyId: string,
    visibilityScope?: VisibilityScope | null,
    scopeUserId?: string,
  ): Promise<UserListItem[]> {
    try {
      const result = await this.usersService.findVolunteers(
        companyId,
        1,
        9999,
        { search: searchTerm },
        visibilityScope,
        scopeUserId,
      );
      return result.data.map((user) => this.mapUserToListItem(user, 'volunteer'));
    } catch (error) {
      console.error('Error searching volunteers:', error);
      return [];
    }
  }

  /**
   * Searches all admin-group collaborateurs: admin, manager, coordinator, recruiter.
   * The visibility scope (resolved from menu-admins sidebar entry) restricts results
   * by establishment when applicable.
   */
  private async searchAdminsUnpaginated(
    searchTerm: string,
    userUid: string,
    companyId: string,
    visibilityScope?: VisibilityScope | null,
  ): Promise<UserListItem[]> {
    try {
      const result = await this.usersService.findAdmins(
        companyId,
        1,
        9999,
        { search: searchTerm, roleCodes: ['ADMIN', 'MANAGER', 'COORDINATOR', 'RECRUITER'] },
        userUid,
        visibilityScope,
      );
      return result.data.map((user) => this.mapUserToListItem(user, 'admin'));
    } catch (error) {
      console.error('Error searching admins:', error);
      return [];
    }
  }

  private async searchLinkedStudentsUnpaginated(
    searchTerm: string,
    tutorUid: string,
    companyId: string,
  ): Promise<UserListItem[]> {
    try {
      const result = await this.usersService.findStudentsForTutor(
        tutorUid,
        companyId,
        1,
        9999,
        { search: searchTerm },
      );
      return result.data.map((user) => this.mapUserToListItem(user, 'student'));
    } catch (error) {
      console.error('Error searching linked students:', error);
      return [];
    }
  }

  private async searchEstablishmentsUnpaginated(
    searchTerm: string,
    companyId: string,
    userUid: string,
    visibilityScope?: VisibilityScope | null,
  ): Promise<EstablishmentListItem[]> {
    try {
      const result = await this.companiesService.searchEstablishments(
        companyId,
        searchTerm,
        1,
        9999,
        userUid,
        undefined,
        visibilityScope,
      );
      return result.data.map((establishment) => ({
        id: establishment.id,
        name: establishment.name,
        type: establishment.type ?? undefined,
        city: establishment.city ?? undefined,
      }));
    } catch (error) {
      console.error('Error searching establishments:', error);
      return [];
    }
  }

  private mapUserToListItem(user: any, defaultRoleCode: string): UserListItem {
    const establishmentName = user.userEstablishments?.[0]?.establishment?.name ?? undefined;
    const primaryRole = user.userRoles?.[0]?.role;
    const roleCode = primaryRole?.code?.toLowerCase() ?? defaultRoleCode;
    const roleLabel = primaryRole?.label ?? this.getRoleLabel(roleCode);

    if (roleCode === 'student') {
      return {
        id: user.id,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        displayName: user.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        email: user.email ?? undefined,
        phoneNumber: user.phoneNumber ?? undefined,
        establishmentName,
        roleCode,
        roleLabel,
      };
    }

    return {
      id: user.id,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? undefined,
      phoneNumber: user.phoneNumber ?? undefined,
      establishmentName,
      roleCode,
      roleLabel,
    };
  }

  private getRoleLabel(roleCode: string): string {
    const labels: Record<string, string> = {
      tutor: 'Tuteur',
      student: 'Élève',
      volunteer: 'Volunteer',
      admin: 'Administrateur',
      coordinator: 'Coordinateur',
      manager: 'Manager',
      recruiter: 'Recruteur',
      superadmin: 'Super-administrateur',
    };
    return labels[roleCode.toLowerCase()] || roleCode;
  }
}
