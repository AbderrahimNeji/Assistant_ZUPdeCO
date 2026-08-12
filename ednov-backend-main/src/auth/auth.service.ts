import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { RoleGroupEntity } from '../modules/roles/entities/role-group.entity';

export interface RoleGroupSummary {
  code: string;
  label: string;
}

export interface RequestUserPayload {
  id: string;
  companyId: string;
  roleCodes: string[];
  mode: 'in_person' | 'remote' | 'hybrid' | null;
  hierarchyLevel: number | null;
  roleGroups: RoleGroupSummary[];
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RoleGroupEntity)
    private readonly roleGroupRepository: Repository<RoleGroupEntity>,
  ) {}

  async getUserByFirebaseUid(firebaseUid: string): Promise<RequestUserPayload> {
    try {
      console.log('[AuthService.getUserByFirebaseUid] ========== START ==========');
      console.log('[AuthService.getUserByFirebaseUid] Searching for Firebase UID:', firebaseUid);
      console.log('[AuthService.getUserByFirebaseUid] Firebase UID type:', typeof firebaseUid);
      console.log('[AuthService.getUserByFirebaseUid] Firebase UID length:', firebaseUid?.length);
      
      const user = await this.userRepository.findOne({
        where: { firebaseUid },
        relations: ['userRoles', 'userRoles.role'],
      });

      if (!user) {
        console.error('[AuthService.getUserByFirebaseUid] ❌ User not found in database');
        console.error('[AuthService.getUserByFirebaseUid] Firebase UID searched:', firebaseUid);
        
        const totalUsers = await this.userRepository.count();
        console.log('[AuthService.getUserByFirebaseUid] Total users in DB:', totalUsers);
        
        const sampleUsers = await this.userRepository.find({
          select: ['id', 'firebaseUid', 'email', 'firstName', 'lastName', 'status', 'deletedAt'],
          take: 5,
          order: { createdAt: 'DESC' },
        });
        console.log('[AuthService.getUserByFirebaseUid] Sample users in DB:', JSON.stringify(sampleUsers, null, 2));
        
        throw new UnauthorizedException(
          'User not found for this account. The Firebase account exists but there is no matching user in the database (or the user may be deactivated).',
        );
      }
      
      console.log('[AuthService.getUserByFirebaseUid] ✅ User found:', {
        id: user.id,
        email: user.email,
        status: user.status,
        deletedAt: user.deletedAt,
        companyId: user.companyId,
      });
      
      if (user.deletedAt) {
        console.error('[AuthService.getUserByFirebaseUid] ❌ User is soft-deleted:', user.deletedAt);
        throw new UnauthorizedException('User is deactivated');
      }
      
      if (user.status === 'deactivated') {
        console.error('[AuthService.getUserByFirebaseUid] ❌ User account is deactivated:', user.status);
        throw new UnauthorizedException(`User status is 'deactivated'`);
      }
      
      const roles =
        user.userRoles
          ?.map((ur) => ur.role?.code)
          .filter((code): code is string => typeof code === 'string') ?? [];

      console.log('[AuthService.getUserByFirebaseUid] User roles:', roles);

      // Calculer mode agrégé : si au moins un rôle est hybrid, le user est hybrid
      // Sinon, prendre le premier mode non-null
      const userRolesData = user.userRoles?.filter((ur) => ur.role) ?? [];
      const modes = userRolesData.map((ur) => ur.role.mode).filter((m): m is 'in_person' | 'remote' | 'hybrid' => m !== null);
      const aggregatedMode = modes.includes('hybrid') ? 'hybrid' : modes[0] ?? null;

      // Calculer hierarchyLevel minimum (plus haut = nombre plus petit)
      const hierarchyLevels = userRolesData
        .map((ur) => ur.role.hierarchyLevel)
        .filter((h): h is number => h !== null);
      const minHierarchy = hierarchyLevels.length > 0 ? Math.min(...hierarchyLevels) : null;

      // Récupérer les codes de groupes uniques
      const uniqueRoleGroupCodes = [
        ...new Set(
          userRolesData
            .map((ur) => ur.role.roleGroup)
            .filter((rg): rg is string => typeof rg === 'string')
        ),
      ];

      // Charger les RoleGroupEntity correspondants pour avoir les labels
      const roleGroupEntities = uniqueRoleGroupCodes.length > 0
        ? await this.roleGroupRepository.find({
            where: {
              companyId: user.companyId,
              code: uniqueRoleGroupCodes as any,
            },
            select: ['code', 'label'],
          })
        : [];

      const roleGroupsMap = new Map(roleGroupEntities.map((rg) => [rg.code, rg.label]));
      const roleGroups: RoleGroupSummary[] = uniqueRoleGroupCodes.map((code) => ({
        code,
        label: roleGroupsMap.get(code) ?? code,
      }));

      console.log('[AuthService.getUserByFirebaseUid] Aggregated mode:', aggregatedMode);
      console.log('[AuthService.getUserByFirebaseUid] Min hierarchy level:', minHierarchy);
      console.log('[AuthService.getUserByFirebaseUid] Role groups:', roleGroups);
      console.log('[AuthService.getUserByFirebaseUid] ========== SUCCESS ==========');
      
      return {
        id: user.id,
        companyId: user.companyId,
        roleCodes: roles,
        mode: aggregatedMode,
        hierarchyLevel: minHierarchy,
        roleGroups,
      };
    } catch (error) {
      console.error('[AuthService.getUserByFirebaseUid] ========== ERROR ==========');
      console.error('[AuthService.getUserByFirebaseUid] Error occurred:', error);
      console.error('[AuthService.getUserByFirebaseUid] Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('[AuthService.getUserByFirebaseUid] Error message:', error instanceof Error ? error.message : 'Unknown');
      throw error;
    }
  }
}
