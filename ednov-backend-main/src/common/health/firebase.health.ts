import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      if (!admin.apps.length) {
        throw new Error('Firebase not initialized');
      }
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError('Firebase check failed', this.getStatus(key, false, { error: (error as Error).message }));
    }
  }
}
