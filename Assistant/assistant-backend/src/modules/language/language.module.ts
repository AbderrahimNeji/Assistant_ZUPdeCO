import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { LanguageService } from './language.service';

@Module({
  imports: [LlmModule],
  providers: [LanguageService],
  exports: [LanguageService],
})
export class LanguageModule {}