import { Injectable, BadRequestException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as admin from 'firebase-admin';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Role } from '../roles/entities/role.entity';
import { Subject } from '../academic/entities/subject.entity';
import { CreateUserWithInvitationDto } from './dto/create-user-with-invitation.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { AuditLogService } from '../audit/audit.service';
import { UsersService } from './users.service';
import { resolveSubjectNames } from './subjects.utils';
import { AssignedPostItTemplatesService } from '../post-its/assigned-post-it-templates.service';
import { TransactionalMailService } from '../mail/transactional-mail.service';
import {
  ACTIVATION_TOKEN_VALIDITY_LABEL,
  ActivationTokenError,
  signActivationToken,
  verifyActivationToken,
} from './invitation-token';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AssignedPostItTemplatesService))
    private readonly assignedPostItTemplatesService: AssignedPostItTemplatesService,
    private readonly mailService: TransactionalMailService,
  ) {}

  /**
   * True when an email-invited account still needs activation. Source of truth is Firebase's
   * `emailVerified` (the legacy DB `email_verified` column was never synced for old invites, so it
   * is unreliable on its own). Safe-defaults to false for phone invites or on lookup failure.
   */
  async isPendingActivation(user: Pick<User, 'email' | 'firebaseUid'>): Promise<boolean> {
    if (!user.email) return false;
    try {
      const record = await admin.auth().getUser(user.firebaseUid);
      return !record.emailVerified;
    } catch (err) {
      this.logger.warn(
        `isPendingActivation: Firebase lookup failed for ${user.firebaseUid}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  /** Reads the Firebase `inviteGen` custom claim (0 if unset). */
  private async getInviteGen(firebaseUid: string): Promise<number> {
    const record = await admin.auth().getUser(firebaseUid);
    const raw = (record.customClaims as Record<string, unknown> | undefined)?.inviteGen;
    return typeof raw === 'number' ? raw : 0;
  }

  /** Sets the Firebase `inviteGen` custom claim, preserving any other existing claims. */
  private async setInviteGen(firebaseUid: string, gen: number): Promise<void> {
    const record = await admin.auth().getUser(firebaseUid);
    const existing = (record.customClaims as Record<string, unknown> | undefined) ?? {};
    await admin.auth().setCustomUserClaims(firebaseUid, { ...existing, inviteGen: gen });
  }

  private buildActivationLink(token: string, email: string, roleGroup: string | null): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const params = new URLSearchParams({ mode: 'activate', token, email });
    if (roleGroup) params.set('roleGroup', roleGroup);
    return `${frontendUrl}/login?${params.toString()}`;
  }

  /** Display name of the user's manager/reference, used in the activation email. */
  private async resolveReferentName(managedById: string | null | undefined): Promise<string | null> {
    if (!managedById) return null;
    const ref = await this.userRepository.findOne({
      where: { id: managedById },
      select: ['id', 'displayName', 'firstName', 'lastName'],
    });
    if (!ref) return null;
    const name =
      ref.displayName?.trim() || `${ref.firstName ?? ''} ${ref.lastName ?? ''}`.trim();
    return name || null;
  }

  /**
   * Issues a fresh activation token (bumping the Firebase `inviteGen` so any previous link
   * is invalidated) and emails it via SendGrid. Returns the activation link.
   */
  private async issueAndSendActivation(params: {
    user: User;
    roleGroup: string | null;
  }): Promise<string> {
    const { user, roleGroup } = params;
    if (!user.email) {
      throw new BadRequestException('Cannot send an activation email to a user without an email');
    }

    const nextGen = (await this.getInviteGen(user.firebaseUid)) + 1;
    await this.setInviteGen(user.firebaseUid, nextGen);

    const token = signActivationToken({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      roleGroup,
      gen: nextGen,
    });
    const activationLink = this.buildActivationLink(token, user.email, roleGroup);

    const referentName = await this.resolveReferentName(user.managedById);
    const sent = await this.mailService.sendAccountActivation({
      to: user.email,
      firstName: user.firstName,
      activationLink,
      validityLabel: ACTIVATION_TOKEN_VALIDITY_LABEL,
      referentName,
    });
    if (!sent) {
      this.logger.warn(
        `Activation email was NOT sent to ${user.email} — check TRANSACTIONAL_MAIL_ENABLED and SENDGRID_API_KEY`,
      );
    } else {
      this.logger.log(`Activation email sent to ${user.email} via SendGrid`);
    }

    return activationLink;
  }

  async createUserWithInvitation(
    companyId: string,
    dto: CreateUserWithInvitationDto,
    actorId?: string,
  ): Promise<{ user: User; invitationLink: string }> {
    console.log('[users/invite] createUserWithInvitation: start', {
      companyId,
      actorId: actorId ?? null,
      inviteBy: dto.inviteBy,
    });
    const establishmentIds = dto.establishmentIds ?? [];

    // Validate that email or phone is provided based on inviteBy
    if (dto.inviteBy === 'email' && !dto.email) {
      console.log('[users/invite] createUserWithInvitation: validation fail — email required');
      throw new BadRequestException('Email is required when inviteBy is "email"');
    }
    if (dto.inviteBy === 'phone' && !dto.phone) {
      console.log('[users/invite] createUserWithInvitation: validation fail — phone required');
      throw new BadRequestException('Phone is required when inviteBy is "phone"');
    }

    console.log('[users/invite] createUserWithInvitation: validateUserAssignments');
    await this.usersService.validateUserAssignments(companyId, dto.establishmentIds, dto.managedById);
    console.log('[users/invite] createUserWithInvitation: validateUserAssignments ok');

    // Check if user already exists
    if (dto.email) {
      console.log('[users/invite] createUserWithInvitation: check existing by email', { email: dto.email });
      const existingByEmail = await this.userRepository.findOne({
        where: { companyId, email: dto.email },
      });
      if (existingByEmail) {
        console.log('[users/invite] createUserWithInvitation: conflict — email exists', {
          existingUserId: existingByEmail.id,
        });
        throw new ConflictException(`User with email "${dto.email}" already exists in this company`);
      }
      console.log('[users/invite] createUserWithInvitation: no duplicate email');
    }

    if (dto.phone) {
      console.log('[users/invite] createUserWithInvitation: check existing by phone', { phone: dto.phone });
      const existingByPhone = await this.userRepository.findOne({
        where: { companyId, phone: dto.phone },
      });
      if (existingByPhone) {
        console.log('[users/invite] createUserWithInvitation: conflict — phone exists', {
          existingUserId: existingByPhone.id,
        });
        throw new ConflictException(`User with phone "${dto.phone}" already exists in this company`);
      }
      console.log('[users/invite] createUserWithInvitation: no duplicate phone');
    }

    // Hoisted so the catch block can rollback the Firebase user if creation succeeds but a later step fails
    let firebaseUser: admin.auth.UserRecord | undefined;
    let firebaseUserCreatedByUs = false;

    try {
      // invitationLink is only needed inside the try scope
      // Email invites: filled after the DB user is saved (the activation token needs the user id).
      let invitationLink = '';

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      console.log('[users/invite] createUserWithInvitation: frontendUrl', { frontendUrl });

      // Load roles once for: tutor validation, user_roles.role_label, and the activation/redirect roleGroup.
      let primaryRoleGroup: string | null = null;
      let rolesForAssignment: Role[] = [];
      let isTutorGroupInvite = false;
      console.log('[users/invite] createUserWithInvitation: checking roleIds', {
        roleIds: dto.roleIds,
        hasRoleIds: !!dto.roleIds,
        roleIdsLength: dto.roleIds?.length,
      });

      if (dto.roleIds && dto.roleIds.length > 0) {
        rolesForAssignment = await this.roleRepository.find({
          where: { id: In(dto.roleIds), companyId },
        });
        if (rolesForAssignment.length !== dto.roleIds.length) {
          throw new ConflictException(
            'One or more role IDs do not exist or do not belong to this company',
          );
        }
        console.log('[users/invite] createUserWithInvitation: roles found', {
          rolesCount: rolesForAssignment.length,
          roleCodes: rolesForAssignment.map((r) => r.code),
          roleGroups: rolesForAssignment.map((r) => r.roleGroup),
        });

        isTutorGroupInvite = rolesForAssignment.some((role) => role.roleGroup === 'tutors');
        console.log('[users/invite] createUserWithInvitation: isTutorGroup check', { 
          isTutorGroup: isTutorGroupInvite 
        });

        // Tutors group is the redirect-relevant group; otherwise use the first role's group.
        primaryRoleGroup = isTutorGroupInvite
          ? 'tutors'
          : rolesForAssignment[0]?.roleGroup ?? null;

        if (isTutorGroupInvite) {
          if (dto.professionalSituation == null) {
            throw new BadRequestException('professionalSituation is required for tutors group');
          }
        }
      } else {
        console.log('[users/invite] createUserWithInvitation: NO roleIds provided in DTO');
      }

      if (dto.inviteBy === 'email') {
        console.log('[users/invite] createUserWithInvitation: Firebase createUser (email path)');
        // Create Firebase user with email
        try {
          firebaseUser = await admin.auth().createUser({
            email: dto.email,
            emailVerified: false,
            displayName: `${dto.firstName} ${dto.lastName}`,
          });
          firebaseUserCreatedByUs = true;
          console.log('[users/invite] createUserWithInvitation: Firebase user created', {
            uid: firebaseUser.uid,
            email: dto.email,
          });
        } catch (firebaseError: any) {
          if (firebaseError.code === 'auth/email-already-exists') {
            // Check if this is an orphan Firebase user (not yet in our DB)
            const existingInDb = await this.userRepository.findOne({
              where: { companyId, email: dto.email },
            });
            if (existingInDb) {
              // Genuine conflict — user exists both in Firebase and our DB
              throw new ConflictException('Cette adresse email est déjà utilisée par un autre compte');
            }
            // Orphan recovery: Firebase user was created by a previous failed attempt
            // Reuse the existing Firebase user to complete the DB creation
            console.log('[users/invite] createUserWithInvitation: orphan Firebase user detected — recovering', {
              email: dto.email,
            });
            firebaseUser = await admin.auth().getUserByEmail(dto.email!);
            firebaseUserCreatedByUs = false; // don't rollback on further error — user pre-existed
          } else {
            throw firebaseError;
          }
        }

        // Activation link (14-day JWT) + SendGrid email are issued after the DB user is saved,
        // since the token embeds the user id. See issueAndSendActivation below.
        console.log('[users/invite] createUserWithInvitation: email Firebase user ready', {
          firebaseUid: firebaseUser.uid,
        });
      } else {
        console.log('[users/invite] createUserWithInvitation: Firebase createUser (phone path)', {
          phone: dto.phone,
        });
        // Create Firebase user with phone
        try {
          firebaseUser = await admin.auth().createUser({
            phoneNumber: dto.phone,
            displayName: `${dto.firstName} ${dto.lastName}`,
          });
          firebaseUserCreatedByUs = true;
          console.log('[users/invite] createUserWithInvitation: Firebase user created (phone)', {
            uid: firebaseUser.uid,
          });
        } catch (firebaseError: any) {
          if (firebaseError.code === 'auth/phone-number-already-exists') {
            // Check if this is an orphan Firebase user (not yet in our DB)
            const existingInDb = await this.userRepository.findOne({
              where: { companyId, phone: dto.phone },
            });
            if (existingInDb) {
              throw new ConflictException('Ce numéro de téléphone est déjà utilisé par un autre compte');
            }
            // Orphan recovery
            console.log('[users/invite] createUserWithInvitation: orphan Firebase user detected (phone) — recovering', {
              phone: dto.phone,
            });
            firebaseUser = await admin.auth().getUserByPhoneNumber(dto.phone!);
            firebaseUserCreatedByUs = false;
          } else {
            throw firebaseError;
          }
        }

        // Generate custom invitation link for phone setup (unchanged flow; link does not expire).
        const phoneRoleParam = primaryRoleGroup
          ? `&roleGroup=${encodeURIComponent(primaryRoleGroup)}`
          : '';
        invitationLink = `${frontendUrl}/login?mode=phone-setup&phone=${encodeURIComponent(dto.phone!)}${phoneRoleParam}`;
        console.log('[users/invite] createUserWithInvitation: phone invitation link built', {
          linkLength: invitationLink.length,
        });
      }

      // Create user in database
      console.log('[users/invite] createUserWithInvitation: persist User entity');

      // At this point firebaseUser is always defined (both branches above assign it)
      if (!firebaseUser) {
        throw new Error('[users/invite] Internal error: Firebase user was not initialized');
      }

      const initialStatus = await this.usersService.resolveInitialStatusForRoles(companyId, dto.roleIds);

      const user = this.userRepository.create({
        companyId,
        firebaseUid: firebaseUser.uid,
        email: dto.email || null,
        phone: dto.phone || null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: `${dto.firstName} ${dto.lastName}`,
        emailVerified: false,
        status: initialStatus,
        managedById: dto.managedById ?? null,
      });

      const savedUser = await this.userRepository.save(user);
      console.log('[users/invite] createUserWithInvitation: user saved', { userId: savedUser.id });

      console.log('[users/invite] createUserWithInvitation: replaceUserEstablishmentLinks', {
        count: establishmentIds.length,
      });
      await this.usersService.replaceUserEstablishmentLinks(savedUser.id, companyId, establishmentIds);

      // Assign roles if provided (role_label denormalized from roles.label)
      if (dto.roleIds && dto.roleIds.length > 0) {
        console.log('[users/invite] createUserWithInvitation: saving roleIds', {
          count: dto.roleIds.length,
        });
        const roleById = new Map(rolesForAssignment.map((r) => [r.id, r]));
        const userRoles = dto.roleIds.map((roleId) => {
          const role = roleById.get(roleId)!;
          return {
            userId: savedUser.id,
            roleId,
            roleLabel: role.label,
          };
        });
        await this.userRoleRepository.save(userRoles);
      } else {
        console.log('[users/invite] createUserWithInvitation: no roleIds to assign');
      }

      // Create or update user profile if any profile fields are provided
      const shouldPersistProfile =
        Boolean(dto.profileId) ||
        Boolean(dto.subjects) ||
        Boolean(dto.availability) ||
        dto.isMinor !== undefined ||
        dto.hasSpecialNeeds !== undefined ||
        Boolean(dto.specialNeedsType) ||
        Boolean(dto.guardianContact) ||
        Boolean(dto.vscReportsFrequencies) ||
        Boolean(dto.engagementStartDate) ||
        Boolean(dto.engagementEndDate) ||
        dto.professionalSituation != null ||
        isTutorGroupInvite;

      if (shouldPersistProfile) {
        console.log('[users/invite] createUserWithInvitation: saving user profile', {
          profileId: dto.profileId || null,
          hasSubjects: Boolean(dto.subjects),
          hasAvailability: Boolean(dto.availability),
        });

        // Resolve subject names from IDs if not provided
        const subjectNames = dto.subjectNames && dto.subjectNames.length > 0
          ? dto.subjectNames
          : await resolveSubjectNames(dto.subjects, this.subjectRepository);

        const userProfile = this.userProfileRepository.create({
          userId: savedUser.id,
          profileId: dto.profileId || null,
          profileLabel: null,
          subjects: dto.subjects || [],
          subjectNames,
          availability: dto.availability || null,
          isMinor: dto.isMinor || false,
          hasSpecialNeeds: dto.hasSpecialNeeds || false,
          specialNeedsType: dto.specialNeedsType || null,
          specialNeedsNote: dto.specialNeedsNote || null,
          guardianContact: dto.guardianContact || null,
          vscReportsFrequencies: dto.vscReportsFrequencies || null,
          engagementStartDate: dto.engagementStartDate
            ? new Date(dto.engagementStartDate)
            : null,
          engagementEndDate: dto.engagementEndDate ? new Date(dto.engagementEndDate) : null,
          professionalSituation: dto.professionalSituation ?? null,
          targetHours: dto.targetHours ?? null,
        });
        await this.userProfileRepository.save(userProfile);
      } else {
        console.log('[users/invite] createUserWithInvitation: no profile fields provided');
      }

      // Log audit
      console.log('[users/invite] createUserWithInvitation: audit log');
      await this.auditLogService.log({
        action: 'CREATE',
        entity: 'User',
        entityId: savedUser.id,
        companyId,
        userId: actorId,
        newValue: {
          inviteBy: dto.inviteBy,
          email: dto.email,
          phone: dto.phone,
          firebaseUid: firebaseUser.uid,
          establishmentIds,
          managedById: dto.managedById,
        },
      });

      // Provision assigned post-it templates for every role the new user is assigned
      if (rolesForAssignment.length > 0) {
        for (const role of rolesForAssignment) {
          try {
            await this.assignedPostItTemplatesService.provisionForNewUser(
              savedUser.id,
              role.code,
              companyId,
            );
          } catch (error) {
            this.logger.error(
              `Failed to provision assigned post-its for user ${savedUser.id}, role ${role.code}:`,
              error,
            );
          }
        }
      }

      // Email invites: issue the 14-day activation token + send the SendGrid email now that the
      // user (and roles) are persisted. Phone invites keep their non-expiring custom link above.
      if (dto.inviteBy === 'email') {
        invitationLink = await this.issueAndSendActivation({
          user: savedUser,
          roleGroup: primaryRoleGroup,
        });
        console.log('[users/invite] createUserWithInvitation: activation email issued', {
          linkLength: invitationLink.length,
        });
      }

      // Fetch complete user with relations
      console.log('[users/invite] createUserWithInvitation: loading complete user with relations');
      const completeUser = await this.userRepository.findOne({
        where: { id: savedUser.id },
        relations: ['userRoles', 'userRoles.role', 'userProfiles', 'userProfiles.profile', 'managedBy'],
      });
      console.log('[users/invite] createUserWithInvitation: done', {
        userId: completeUser?.id,
        hasCompleteUser: Boolean(completeUser),
      });

      return {
        user: completeUser!,
        invitationLink,
      };
    } catch (error) {
      const err = error as Error;
      console.error('[users/invite] createUserWithInvitation: error', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      // Rollback: if WE created the Firebase user and something failed after,
      // delete it so a retry won't hit auth/email-already-exists as an orphan.
      if (firebaseUserCreatedByUs && firebaseUser) {
        try {
          await admin.auth().deleteUser(firebaseUser.uid);
          console.warn('[users/invite] createUserWithInvitation: Firebase user rolled back', {
            uid: firebaseUser.uid,
          });
        } catch (rollbackErr) {
          console.error('[users/invite] createUserWithInvitation: Firebase rollback failed', rollbackErr);
        }
      }
      throw error;
    }
  }

  /**
   * Completes account activation from an email invite: validates the 14-day token, checks it is
   * the latest generation (Firebase `inviteGen`), then sets the password and marks the account
   * verified. Single-use: a second attempt fails because emailVerified is now true and the gen
   * has been bumped.
   */
  async activateAccount(dto: ActivateAccountDto): Promise<{ email: string; roleGroup: string | null }> {
    let payload: ReturnType<typeof verifyActivationToken>;
    try {
      payload = verifyActivationToken(dto.token);
    } catch (err) {
      if (err instanceof ActivationTokenError && err.reason === 'expired') {
        throw new BadRequestException(
          "Ce lien d'activation a expiré. Contactez votre référent pour en recevoir un nouveau.",
        );
      }
      throw new BadRequestException("Lien d'activation invalide.");
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, companyId: payload.companyId },
    });
    if (!user) {
      throw new BadRequestException("Lien d'activation invalide.");
    }

    if (user.emailVerified) {
      throw new ConflictException('Ce compte a déjà été activé. Connectez-vous avec votre mot de passe.');
    }

    const currentGen = await this.getInviteGen(user.firebaseUid);
    if (payload.gen !== currentGen) {
      throw new BadRequestException(
        "Ce lien d'activation n'est plus valide. Contactez votre référent pour en recevoir un nouveau.",
      );
    }

    // Set the password on the Firebase user and mark verified.
    await admin.auth().updateUser(user.firebaseUid, {
      password: dto.password,
      emailVerified: true,
    });

    // Invalidate this token (and any other outstanding link) by bumping the generation.
    await this.setInviteGen(user.firebaseUid, currentGen + 1);

    user.emailVerified = true;
    await this.userRepository.save(user);

    await this.auditLogService.log({
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      companyId: user.companyId,
      userId: user.id,
      newValue: { activated: true },
    });

    return { email: user.email ?? payload.email, roleGroup: payload.roleGroup };
  }

  /**
   * Regenerates a fresh 14-day activation link and re-sends the email. Used by the "Régénérer le
   * lien" action in the edit modal. Only allowed while the account is not yet activated.
   */
  async regenerateInvitation(
    userId: string,
    companyId: string,
    actorId?: string,
  ): Promise<{ sent: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, companyId },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }
    if (!user.email) {
      throw new BadRequestException(
        "Cet utilisateur n'a pas d'adresse email (invitation par téléphone).",
      );
    }
    if (!(await this.isPendingActivation(user))) {
      throw new ConflictException('Ce compte est déjà activé.');
    }

    const tutorGroup = user.userRoles?.some((ur) => ur.role?.roleGroup === 'tutors');
    const primaryRoleGroup = tutorGroup
      ? 'tutors'
      : user.userRoles?.find((ur) => ur.role?.roleGroup)?.role?.roleGroup ?? null;

    await this.issueAndSendActivation({ user, roleGroup: primaryRoleGroup });

    await this.auditLogService.log({
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      companyId,
      userId: actorId,
      newValue: { invitationRegenerated: true },
    });

    return { sent: true };
  }
}
