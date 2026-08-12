import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { IntegrationModule } from '../integration/integration.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getJwtSecret } from './jwt-secret';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenRevocationService } from './token-revocation.service';

@Module({
  imports: [
    PassportModule,
    IntegrationModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        // 24 hours — override via JWT_EXPIRES_IN is applied in AuthService docs only;
        // Nest JwtModule types require a narrow StringValue, so keep a literal here.
        expiresIn: '24h',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenRevocationService,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    TokenRevocationService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
