import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AcademicAdapter } from './adapters/academic.adapter';
import { CalendarAdapter } from './adapters/calendar.adapter';
import { NotificationAdapter } from './adapters/notification.adapter';
import { RegistrationAdapter } from './adapters/registration.adapter';
import { ResourceAdapter } from './adapters/resource.adapter';
import { UserAdapter } from './adapters/user.adapter';
import { DashboardAdapter } from './adapters/dashboard.adapter';
import { MatchingAdapter } from './adapters/matching.adapter';
import { SettingsAdapter } from './adapters/settings.adapter';
import { GamificationAdapter } from './adapters/gamification.adapter';
import { EdnovApiClient } from './ednov-api.client';
import { FirebaseAuthBridgeService } from './firebase-auth-bridge.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    EdnovApiClient,
    FirebaseAuthBridgeService,
    UserAdapter,
    AcademicAdapter,
    RegistrationAdapter,
    CalendarAdapter,
    NotificationAdapter,
    ResourceAdapter,
    DashboardAdapter,
    MatchingAdapter,
    SettingsAdapter,
    GamificationAdapter,
  ],
  exports: [
    EdnovApiClient,
    FirebaseAuthBridgeService,
    UserAdapter,
    AcademicAdapter,
    RegistrationAdapter,
    CalendarAdapter,
    NotificationAdapter,
    ResourceAdapter,
    DashboardAdapter,
    MatchingAdapter,
    SettingsAdapter,
    GamificationAdapter,
  ],
})
export class IntegrationModule {}
