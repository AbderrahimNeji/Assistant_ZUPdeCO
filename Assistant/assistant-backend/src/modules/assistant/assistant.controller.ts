import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentParserService } from '../documents/services/document-parser.service';
import { RequestContextStore } from '../integration/request-context';
import { AssistantService } from './assistant.service';
import type { ChatStreamEvent } from './chat-stream.types';
import { ChatDto } from './dto/chat.dto';
import { parseApplicationContext } from '../../common/security/application-context.schema';
import { toClientSafeErrorMessage } from '../../common/security/safe-client-error';
import { multerUploadFilter } from '../../common/security/upload-guard';
import { Throttle } from '@nestjs/throttler';

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENT_CHARS = 80_000;

type AuthedRequest = ExpressRequest & { user: { id: string } };

@ApiTags('Assistant')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 40, ttl: 60_000 } })
@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly parser: DocumentParserService,
  ) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Chat with Assistant',
    description:
      'Sends a message to the RAG assistant. Optional attachments are stored on the conversation (not permanently indexed) and reused for later turns.',
  })
  @ApiBody({ type: ChatDto })
  @ApiResponse({
    status: 201,
    description: 'Assistant reply with conversationId and sources',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found or not owned by the user',
  })
  async chat(@Req() req: AuthedRequest, @Body() body: ChatDto) {
    this.bindApplicationContext(body.applicationContext);
    return this.assistantService.chat(
      req.user.id,
      body.message ?? '',
      body.conversationId,
      body.attachments,
      body.action,
      body.confirm,
      {
        regenerate: body.regenerate,
        editMessageId: body.editMessageId,
        parentMessageId: body.parentMessageId,
        executionMode: body.executionMode,
      },
    );
  }

  @Post('chat/stream')
  @ApiOperation({
    summary: 'Chat with Assistant (SSE stream)',
    description:
      'Streams answer tokens as Server-Sent Events, then a complete or interrupted payload. Does not stream prompts or retrieved context.',
  })
  @ApiBody({ type: ChatDto })
  @ApiResponse({
    status: 200,
    description:
      'text/event-stream with token | status | complete | interrupted | error events',
  })
  async chatStream(
    @Req() req: AuthedRequest,
    @Res() res: Response,
    @Body() body: ChatDto,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const abort = new AbortController();
    const onClose = () => {
      if (!abort.signal.aborted) abort.abort();
    };
    req.on('close', onClose);

    const writeEvent = (event: ChatStreamEvent) => {
      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      this.bindApplicationContext(body.applicationContext);
      const result = await this.assistantService.chat(
        req.user.id,
        body.message ?? '',
        body.conversationId,
        body.attachments,
        body.action,
        body.confirm,
        {
          regenerate: body.regenerate,
          editMessageId: body.editMessageId,
          parentMessageId: body.parentMessageId,
          executionMode: body.executionMode,
          stream: {
            signal: abort.signal,
            onToken: (text) => writeEvent({ type: 'token', text }),
            onStatus: (phase, conversationId) =>
              writeEvent({ type: 'status', phase, conversationId }),
          },
        },
      );

      const interrupted = Boolean(
        (result as { interrupted?: boolean }).interrupted,
      );
      const payload = { ...(result as Record<string, unknown>) };
      delete payload.interrupted;

      if (interrupted) {
        writeEvent({
          type: 'interrupted',
          payload,
          message: 'Generation stopped.',
        });
      } else {
        writeEvent({ type: 'complete', payload });
      }
    } catch (error: unknown) {
      writeEvent({
        type: 'error',
        message: toClientSafeErrorMessage(error),
      });
    } finally {
      req.off('close', onClose);
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  @Post('attachments/parse')
  @ApiOperation({
    summary: 'Parse a chat attachment without indexing it',
    description:
      'Extracts text from an uploaded file for temporary conversation context. Does not store or index the file in the knowledge base.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_ATTACHMENT_BYTES,
        files: 1,
      },
      fileFilter: multerUploadFilter,
    }),
  )
  async parseAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const parsed = await this.parser.parse(file);
    const text = parsed.text?.trim() ?? '';

    if (!text) {
      throw new BadRequestException(
        'No readable text could be extracted from this file.',
      );
    }

    return {
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      pageCount: parsed.pageCount,
      text:
        text.length > MAX_ATTACHMENT_CHARS
          ? `${text.slice(0, MAX_ATTACHMENT_CHARS)}\n\n…(truncated)`
          : text,
    };
  }

  private bindApplicationContext(
    raw: Record<string, unknown> | undefined,
  ): void {
    RequestContextStore.setApplicationContext(parseApplicationContext(raw));
  }
}
