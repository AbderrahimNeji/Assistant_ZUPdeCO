import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { FirebaseHealthIndicator } from '../common/health/firebase.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [FirebaseHealthIndicator],
})
export class HealthModule {}
