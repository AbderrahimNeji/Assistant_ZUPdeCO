import { Module } from '@nestjs/common';
import { GroqModule } from '../groq/groq.module';
import { HelpAssistantController } from './help-assistant.controller';
import { HelpAssistantService } from './help-assistant.service';
import { HelpKnowledgeService } from './help-knowledge.service';

@Module({
  imports: [GroqModule],
  controllers: [HelpAssistantController],
  providers: [HelpKnowledgeService, HelpAssistantService],
})
export class HelpAssistantModule {}
