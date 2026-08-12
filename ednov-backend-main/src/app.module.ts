import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { getTypeOrmConfig } from './common/config/typeorm.config';
import { monolithEnvSchema } from './common/config/env.validation';
import { AuthModule } from './auth/auth.module';
import { FirebaseJwtGuard } from './auth/firebase-jwt.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthModule } from './health/health.module';
import { UsersModule } from './modules/users/users.module';
import { UserPreferencesModule } from './modules/user-preferences/user-preferences.module';
import { InterfaceElementsModule } from './modules/interface-elements/interface-elements.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RolesModule } from './modules/roles/roles.module';
import { RulesModule } from './modules/rules/rules.module';
import { AcademicModule } from './modules/academic/academic.module';
import { ActivityModule } from './modules/activity/activity.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BrandingModule } from './modules/branding/branding.module';
import { AuditModule } from './modules/audit/audit.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { PostItsModule } from './modules/post-its/post-its.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ActivityFeedModule } from './modules/activity-feed/activity-feed.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HelpAssistantModule } from './modules/help-assistant/help-assistant.module';
import { SearchModule } from './modules/search/search.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { VisibilityModule } from './common/visibility/visibility.module';
import { VisibilityScopeInterceptor } from './common/visibility/visibility-scope.interceptor';
import { ActionScopesInterceptor } from './common/visibility/action-scopes.interceptor';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validationSchema: monolithEnvSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    TypeOrmModule.forRoot(getTypeOrmConfig()),
    ScheduleModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      ttl: 300000,
      max: 100,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TerminusModule,
    HealthModule,
    AuthModule,
    UsersModule,
    UserPreferencesModule,
    InterfaceElementsModule,
    CompaniesModule,
    ProfilesModule,
    RolesModule,
    RulesModule,
    AcademicModule,
    ActivityModule,
    SessionsModule,
    SettingsModule,
    BrandingModule,
    AuditModule,
    OutboxModule,
    PostItsModule,
    CalendarModule,
    GamificationModule,
    ResourcesModule,
    ActivityFeedModule,
    DashboardModule,
    HelpAssistantModule,
    SearchModule,
    SpecialtiesModule,
    VisibilityModule,
    NotificationsModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: FirebaseJwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: VisibilityScopeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ActionScopesInterceptor },
  ],
})
export class AppModule {}
