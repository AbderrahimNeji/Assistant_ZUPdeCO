import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { MemoryModule } from '../memory/memory.module';
import { ConversationAttachmentService } from './conversation-attachment.service';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';

@Module({
  imports: [PrismaModule, AuthModule, DocumentsModule, MemoryModule],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationAttachmentService],
  exports: [ConversationService, ConversationAttachmentService],
})
export class ConversationModule {}
