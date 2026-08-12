import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';

import { PrismaService } from '../../prisma/prisma.service';
import { EdnovApiClient } from './ednov-api.client';
import {
  classifyFirebaseTokenError,
  firebaseErrorLogLabel,
} from './firebase-token-error';
import { getAuthMode } from './request-context';
import {
  EdnovLoginUser,
  extractEdnovRoleCodes,
  mapEdnovRolesToUserRole,
} from './role-mapper';

export type BridgedAuthUser = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  firebaseUid?: string;
  ednovUserId?: string;
  ednovCompanyId?: string;
};

/**
 * Verifies Firebase ID tokens and upserts a local Assistant User so that
 * ToolOrchestrator / ApplicationKnowledgeSource can load ToolUserContext
 * from Prisma without any changes to those modules.
 */
@Injectable()
export class FirebaseAuthBridgeService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAuthBridgeService.name);
  private initialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ednovApi: EdnovApiClient,
  ) {}

  onModuleInit() {
    if (getAuthMode() !== 'firebase') {
      return;
    }
    this.ensureFirebaseApp();
  }

  ensureFirebaseApp(): void {
    if (this.initialized || admin.apps.length) {
      this.initialized = true;
      return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'AUTH_MODE=firebase requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY',
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    this.initialized = true;
    this.logger.log('Firebase Admin initialized for AUTH_MODE=firebase');
  }

  async authenticate(idToken: string): Promise<BridgedAuthUser> {
    this.ensureFirebaseApp();

    const decoded = await this.verifyFirebaseToken(idToken);

    if (!decoded?.uid) {
      throw new UnauthorizedException('Invalid Firebase token payload');
    }

    const ednovUser = await this.ednovApi.get<EdnovLoginUser>('/users/login', {
      accessToken: idToken,
    });

    if (!ednovUser?.id) {
      throw new UnauthorizedException('Ednov user not found for Firebase token');
    }

    const role = mapEdnovRolesToUserRole(extractEdnovRoleCodes(ednovUser));
    const email =
      ednovUser.email?.trim() ||
      decoded.email ||
      `${decoded.uid}@firebase.local`;
    const firstName =
      ednovUser.firstName?.trim() ||
      ednovUser.displayName?.split(/\s+/)[0] ||
      'Ednov';
    const lastName =
      ednovUser.lastName?.trim() ||
      ednovUser.displayName?.split(/\s+/).slice(1).join(' ') ||
      'User';

    const localUser = await this.upsertLocalUser({
      id: ednovUser.id,
      email,
      firstName,
      lastName,
      role,
    });

    return {
      id: localUser.id,
      email: localUser.email,
      role: localUser.role,
      firstName: localUser.firstName,
      lastName: localUser.lastName,
      firebaseUid: decoded.uid,
      ednovUserId: ednovUser.id,
      ednovCompanyId: ednovUser.companyId?.trim() || undefined,
    };
  }

  /**
   * Prefer checkRevoked so disabled/revoked sessions are rejected.
   * If that extra lookup fails (IAM, network, Firebase internal), verify the
   * JWT signature only — do not lock out a still-valid session.
   */
  private async verifyFirebaseToken(
    idToken: string,
  ): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken, true);
    } catch (error: unknown) {
      const kind = classifyFirebaseTokenError(error);
      const label = firebaseErrorLogLabel(error);

      if (kind === 'revoked') {
        this.logger.warn(`Firebase token revoked or user disabled (${label})`);
        throw new UnauthorizedException('Session expired. Please sign in again.');
      }
      if (kind === 'invalid') {
        this.logger.warn(`Firebase ID token rejected (${label})`);
        throw new UnauthorizedException('Invalid Firebase ID token');
      }

      this.logger.warn(
        `Firebase checkRevoked failed (${label}); verifying signature only`,
      );
      try {
        return await admin.auth().verifyIdToken(idToken, false);
      } catch (fallbackError: unknown) {
        const fallbackKind = classifyFirebaseTokenError(fallbackError);
        if (fallbackKind === 'revoked') {
          throw new UnauthorizedException('Session expired. Please sign in again.');
        }
        this.logger.warn(
          `Firebase ID token rejected after signature-only verify (${firebaseErrorLogLabel(fallbackError)})`,
        );
        throw new UnauthorizedException('Invalid Firebase ID token');
      }
    }
  }

  private async upsertLocalUser(input: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  }) {
    const existingById = await this.prisma.user.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (existingById) {
      return this.prisma.user.update({
        where: { id: input.id },
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingByEmail && existingByEmail.id !== input.id) {
      // Prefer Ednov id as the canonical Assistant user id for conversations.
      // If email collides with a different local demo user, update that row in place
      // is unsafe — create under Ednov id with a uniquified email suffix for uniqueness.
      this.logger.warn(
        `Email ${input.email} already mapped to ${existingByEmail.id}; creating Ednov id ${input.id}`,
      );
    }

    const unusablePassword = await bcrypt.hash(`firebase:${input.id}`, 10);

    try {
      return await this.prisma.user.create({
        data: {
          id: input.id,
          email: existingByEmail ? `${input.id}.${input.email}` : input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          password: unusablePassword,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
    } catch {
      // Race: another request created the user.
      const raced = await this.prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
      if (!raced) {
        throw new UnauthorizedException('Unable to provision assistant user');
      }
      return raced;
    }
  }
}
