import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { HelpAssistantService } from './help-assistant.service';
import { HelpChatDto } from './dto/help-chat.dto';

@ApiTags('ai')
@ApiBearerAuth('Firebase')
@Controller('ai')
export class HelpAssistantController {
  constructor(private readonly helpAssistantService: HelpAssistantService) {}

  @Post('help-chat')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Platform help assistant (RAG + Groq)' })
  @ApiResponse({
    status: 200,
    description: 'Assistant reply and optional related section titles',
    schema: {
      properties: {
        reply: { type: 'string' },
        relatedSections: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Groq not configured' })
  async helpChat(@Body() body: HelpChatDto) {
    return this.helpAssistantService.chat(body);
  }
}
