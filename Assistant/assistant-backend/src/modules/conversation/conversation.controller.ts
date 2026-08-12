import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
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
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentParserService } from '../documents/services/document-parser.service';
import { ConversationAttachmentService } from './conversation-attachment.service';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SetActiveBranchDto } from './dto/set-active-branch.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { multerUploadFilter } from '../../common/security/upload-guard';

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

@ApiTags('Conversation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('conversation')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly attachmentService: ConversationAttachmentService,
    private readonly parser: DocumentParserService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all user conversations',
  })
  async findAll(@Request() req) {
    return this.conversationService.findAll(req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new conversation',
  })
  async create(@Request() req, @Body() body: CreateConversationDto = {}) {
    return this.conversationService.create(req.user.id, body?.title);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete all conversations for the current user',
  })
  async deleteAll(@Request() req) {
    return this.conversationService.deleteAll(req.user.id);
  }

  @Get(':id/attachments')
  @ApiOperation({
    summary: 'List conversation attachments (metadata only)',
  })
  async listAttachments(@Request() req, @Param('id') id: string) {
    return this.attachmentService.list(id, req.user.id);
  }

  @Post(':id/attachments')
  @ApiOperation({
    summary: 'Upload and store a conversation attachment (not KB-indexed)',
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
  async uploadAttachment(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
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

    return this.attachmentService.create(id, req.user.id, {
      name: file.originalname,
      text,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @Put(':id/attachments/:attachmentId')
  @ApiOperation({
    summary: 'Replace a conversation attachment file',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_ATTACHMENT_BYTES,
        files: 1,
      },
      fileFilter: multerUploadFilter,
    }),
  )
  async replaceAttachment(
    @Request() req,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
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

    return this.attachmentService.replace(id, attachmentId, req.user.id, {
      name: file.originalname,
      text,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({
    summary: 'Remove a conversation attachment',
  })
  async deleteAttachment(
    @Request() req,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.attachmentService.remove(id, attachmentId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one conversation',
  })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.conversationService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a conversation (rename and/or pin)',
  })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateConversationDto,
  ) {
    return this.conversationService.update(id, req.user.id, body);
  }

  @Post(':id/active-branch')
  @ApiOperation({
    summary: 'Switch the active conversation branch or message version',
  })
  async setActiveBranch(
    @Request() req,
    @Param('id') id: string,
    @Body() body: SetActiveBranchDto,
  ) {
    return this.conversationService.setActiveBranch(id, req.user.id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete one conversation',
  })
  async delete(@Request() req, @Param('id') id: string) {
    return this.conversationService.delete(id, req.user.id);
  }
}
