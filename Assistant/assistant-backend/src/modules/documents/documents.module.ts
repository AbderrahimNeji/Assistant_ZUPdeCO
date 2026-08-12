import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentParserService } from './services/document-parser.service';
import { ChunkService } from './services/chunk.service';
import { EmbeddingService } from './services/embedding.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentStorageService } from './services/document-storage.service';
import { RetrievalService } from './services/retrieval.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DocumentsController],
  providers: [
  DocumentsService,
  DocumentParserService,
  ChunkService,
  EmbeddingService,
  DocumentStorageService,
  RetrievalService,
],
  exports: [
  DocumentsService,
  DocumentParserService,
  ChunkService,
  EmbeddingService,
  DocumentStorageService, 
  RetrievalService,
],
})
export class DocumentsModule {}
