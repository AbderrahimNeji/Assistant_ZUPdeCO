import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rule } from './entities/rule.entity';
import { RuleOverride } from './entities/rule-override.entity';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rule, RuleOverride]),
    AuditModule,
  ],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [TypeOrmModule, RulesService],
})
export class RulesModule {}
