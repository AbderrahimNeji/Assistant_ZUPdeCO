import { Controller, Get, Post, Body, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SessionsAiService } from './sessions-ai.service';
import { SessionAiChatDto } from './dto/session-ai-chat.dto';
import { SessionAiChatHistoryQueryDto } from './dto/session-ai-chat-history-query.dto';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

/**
 * Dedicated controller for session AI chat at POST /api/v1/ai/session-chat.
 * Kept outside "sessions" to avoid any route shadowing.
 */
@ApiTags('sessions')
@ApiBearerAuth('Firebase')
@Controller('ai')
export class SessionsAiChatController {
  constructor(private readonly sessionsAiService: SessionsAiService) {}

  @Get('session-chat/history')
  @ApiOperation({ summary: 'Get session AI chat history' })
  @ApiQuery({ name: 'sessionId', required: true, type: String, description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'List of messages (role, content)' })
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query() query: SessionAiChatHistoryQueryDto,
  ) {
    const messages = await this.sessionsAiService.getChatHistory(
      query.sessionId,
      req.user.company_id,
      req.user.uid,
      req.user?.roles ?? [],
    );
    return { messages };
  }

  @Post('session-chat')
  @ApiOperation({ summary: 'Session-scoped tutor AI assistant chat' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'messages'],
      properties: {
        sessionId: { type: 'string', format: 'uuid', description: 'Session ID' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            required: ['role', 'content'],
            properties: {
              role: { type: 'string', enum: ['user', 'assistant'] },
              content: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Assistant reply' })
  @ApiResponse({ status: 400, description: 'Invalid body or no messages' })
  @ApiResponse({ status: 503, description: 'AI not configured (GROQ_API_KEY)' })
  async chat(@Request() req: AuthenticatedRequest, @Body() body: SessionAiChatDto) {
    return this.sessionsAiService.chat(
      body.sessionId,
      req.user.company_id,
      req.user.uid,
      req.user?.roles ?? [],
      { messages: body.messages },
    );
  }
}
