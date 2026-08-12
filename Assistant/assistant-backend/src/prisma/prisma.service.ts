import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { ErrorLogger } from '../common/logger/error-logger';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Connected to PostgreSQL');
    } catch (error) {
      ErrorLogger.log(error, 'PrismaService.onModuleInit');
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (error) {
      ErrorLogger.log(error, 'PrismaService.onModuleDestroy');
      throw error;
    }
  }
}
