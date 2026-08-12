import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { DocumentParserService } from './services/document-parser.service';
import { EmbeddingService } from './services/embedding.service';
import { DocumentStorageService } from './services/document-storage.service';
import { RetrievalService } from './services/retrieval.service';
import { SearchDocumentDto } from './dto/search-document.dto';
import { multerUploadFilter } from '../../common/security/upload-guard';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly parser: DocumentParserService,
    private readonly embeddingService: EmbeddingService,
    private readonly storage: DocumentStorageService,
    private readonly retrievalService: RetrievalService,
  ) {}

  @Post('search')
  @ApiOperation({ summary: 'Semantic search across indexed documents' })
  async search(@Request() req, @Body() body: SearchDocumentDto) {
    const embedding = await this.embeddingService.embed(body.question);

    const results = await this.retrievalService.search(
      req.user.id,
      embedding,
      5,
    );

    return {
      question: body.question,
      results: results.map((result) => ({
        score: result.score,
        chunk: result.content.substring(0, 300),
      })),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all user documents' })
  async findAll(@Request() req) {
    return this.documentsService.findAll(req.user.id);
  }

  @Post('upload')
  @ApiOperation({
    summary:
      'Upload a document (returns quickly while indexing continues in the background)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 15 * 1024 * 1024,
        files: 1,
      },
      fileFilter: multerUploadFilter,
    }),
  )
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const parsed = await this.parser.parse(file);

    if (!parsed.text?.trim()) {
      throw new BadRequestException(
        'No readable text could be extracted from this file.',
      );
    }

    const document = await this.storage.createProcessingDocument({
      userId: req.user.id,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      rawText: parsed.text,
      pageCount: parsed.pageCount,
    });

    void this.documentsService.indexDocument(document.id, req.user.id);

    return {
      success: true,
      documentId: document.id,
      status: document.status,
      pageCount: document.pageCount,
      chunks: 0,
      embeddings: 0,
      dimension: 0,
    };
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry indexing a failed document' })
  async retry(@Request() req, @Param('id') id: string) {
    return this.documentsService.retry(id, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.documentsService.findOne(id, req.user.id);
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: 'Get document chunks' })
  async findChunks(@Request() req, @Param('id') id: string) {
    return this.documentsService.findChunks(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.documentsService.delete(id, req.user.id);
  }
}
