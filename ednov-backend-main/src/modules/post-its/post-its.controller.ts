import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PostItsService } from './post-its.service';
import { PostItSharesService } from './post-it-shares.service';
import { CreatePostItDto } from './dto/create-post-it.dto';
import { UpdatePostItDto } from './dto/update-post-it.dto';
import { SharePostItDto, SharePostItByRoleDto, UpdateSharePermissionDto } from './dto/share-post-it.dto';
import { PostItResponseDto, PostItListResponseDto } from './dto/post-it-response.dto';
import { FirebaseJwtGuard } from '../../auth/firebase-jwt.guard';
import { PostItStatus } from './entities/post-it.entity';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('post-its')
@ApiBearerAuth('Firebase')
@Controller('post-its')
@UseGuards(FirebaseJwtGuard)
export class PostItsController {
  constructor(
    private readonly postItsService: PostItsService,
    private readonly postItSharesService: PostItSharesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new post-it' })
  @ApiResponse({ status: 201, description: 'Post-it created successfully', type: PostItResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createDto: CreatePostItDto, @Request() req: AuthenticatedRequest): Promise<PostItResponseDto> {
    return this.postItsService.create(createDto, req.user.uid, req.user.company_id);
  }

  @Get()
  @ApiOperation({ summary: 'List all post-its with optional filters' })
  @ApiQuery({ name: 'archived', required: false, type: String, description: 'Filter by archived status (true/false)' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Filter by priority status (true/false)' })
  @ApiQuery({ name: 'thematic', required: false, type: String, description: 'Filter by thematic' })
  @ApiQuery({ name: 'status', required: false, enum: ['en_cours', 'depasse', 'done'], description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in title and content' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'ISO 8601 — filter by deadline >= dateFrom' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'ISO 8601 — filter by deadline <= dateTo' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 100)' })
  @ApiResponse({ status: 200, description: 'Post-its retrieved successfully', type: PostItListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('archived') archived?: string,
    @Query('priority') priority?: string,
    @Query('thematic') thematic?: string,
    @Query('status') status?: PostItStatus,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
  ): Promise<PostItListResponseDto> {
    const filters: any = {};

    if (archived !== undefined) {
      filters.archived = archived === 'true';
    }

    if (priority !== undefined) {
      filters.priority = priority === 'true';
    }

    if (thematic) {
      filters.thematic = thematic;
    }

    if (status) {
      filters.status = status;
    }

    if (search) {
      filters.search = search;
    }

    return this.postItsService.findAll(req.user.uid, req.user.company_id, filters, page, limit, dateFrom, dateTo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a post-it by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 200, description: 'Post-it retrieved successfully', type: PostItResponseDto })
  @ApiResponse({ status: 404, description: 'Post-it not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest): Promise<PostItResponseDto> {
    return this.postItsService.findOne(id, req.user.uid, req.user.company_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a post-it' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 200, description: 'Post-it updated successfully', type: PostItResponseDto })
  @ApiResponse({ status: 404, description: 'Post-it not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (requires write access)' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePostItDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PostItResponseDto> {
    return this.postItsService.update(id, updateDto, req.user.uid, req.user.company_id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a post-it (POC-317: now archives instead of soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 204, description: 'Post-it archived successfully' })
  @ApiResponse({ status: 404, description: 'Post-it not found' })
  @ApiResponse({ status: 403, description: 'Only the creator can archive the post-it' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest): Promise<void> {
    return this.postItsService.remove(id, req.user.uid, req.user.company_id);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete an archived post-it (hard delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 204, description: 'Post-it permanently deleted' })
  @ApiResponse({ status: 404, description: 'Archived post-it not found' })
  @ApiResponse({ status: 403, description: 'Only the creator can permanently delete' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async hardDelete(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest): Promise<void> {
    return this.postItsService.hardDelete(id, req.user.uid, req.user.company_id);
  }

  @Delete('trash/empty')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Empty trash - permanently delete all archived post-its of the user' })
  @ApiResponse({
    status: 200,
    description: 'Trash emptied successfully',
    schema: { properties: { count: { type: 'number' } } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async emptyTrash(@Request() req: AuthenticatedRequest): Promise<{ count: number }> {
    const count = await this.postItsService.emptyTrash(req.user.uid, req.user.company_id);
    return { count };
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Toggle archive status of a post-it' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 200, description: 'Archive status toggled successfully', type: PostItResponseDto })
  @ApiResponse({ status: 404, description: 'Post-it not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (requires write access)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async toggleArchive(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest): Promise<PostItResponseDto> {
    return this.postItsService.toggleArchive(id, req.user.uid, req.user.company_id);
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Toggle priority status of a post-it' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 200, description: 'Priority status toggled successfully', type: PostItResponseDto })
  @ApiResponse({ status: 404, description: 'Post-it not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (requires write access)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async togglePriority(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest): Promise<PostItResponseDto> {
    return this.postItsService.togglePriority(id, req.user.uid, req.user.company_id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the status of a post-it' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully', type: PostItResponseDto })
  @ApiResponse({ status: 404, description: 'Post-it not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (requires write access)' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: PostItStatus,
    @Request() req: AuthenticatedRequest,
  ): Promise<PostItResponseDto> {
    return this.postItsService.updateStatus(id, status, req.user.uid, req.user.company_id);
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Share a post-it with specific users' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 200, description: 'Post-it shared successfully' })
  @ApiResponse({ status: 404, description: 'Post-it not found' })
  @ApiResponse({ status: 403, description: 'Only the creator can share the post-it' })
  @ApiResponse({ status: 400, description: 'Invalid user IDs or permission' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async shareWithUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() shareDto: SharePostItDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string; sharesCount: number }> {
    const shares = await this.postItSharesService.shareWithUsers(
      id,
      shareDto.userIds,
      shareDto.permission,
      req.user.uid,
      req.user.company_id,
    );

    return {
      message: 'Post-it shared successfully',
      sharesCount: shares.length,
    };
  }

  @Post(':id/share/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Share a post-it with all users having a specific role' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 200, description: 'Post-it shared with role successfully' })
  @ApiResponse({ status: 404, description: 'Post-it or role not found' })
  @ApiResponse({ status: 403, description: 'Only the creator can share the post-it' })
  @ApiResponse({ status: 400, description: 'Invalid role code or permission' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async shareWithRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() shareDto: SharePostItByRoleDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string; sharesCount: number }> {
    const shares = await this.postItSharesService.shareWithRole(
      id,
      shareDto.roleCode,
      shareDto.permission,
      req.user.uid,
      req.user.company_id,
    );

    return {
      message: 'Post-it shared with role successfully',
      sharesCount: shares.length,
    };
  }

  @Delete(':id/share/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user\'s access to a post-it' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID to remove' })
  @ApiResponse({ status: 204, description: 'Share removed successfully' })
  @ApiResponse({ status: 404, description: 'Post-it or share not found' })
  @ApiResponse({ status: 403, description: 'Only the creator can remove shares' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeShare(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.postItSharesService.removeShare(id, userId, req.user.uid, req.user.company_id);
  }

  @Get(':id/shares')
  @ApiOperation({ summary: 'Get all shares for a post-it' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Post-it ID' })
  @ApiResponse({ status: 200, description: 'Shares retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post-it not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getShares(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    const shares = await this.postItSharesService.getSharesForPostIt(id, req.user.company_id);
    return {
      shares: shares.map((share) => ({
        id: share.id,
        userId: share.userId,
        userName: share.user
          ? `${share.user.firstName || ''} ${share.user.lastName || ''}`.trim() || share.user.email || 'Unknown'
          : 'Unknown',
        userEmail: share.user?.email || '',
        permission: share.permission,
        sharedAt: share.sharedAt,
        sharedById: share.sharedById,
        sharedByName: share.sharedBy
          ? `${share.sharedBy.firstName || ''} ${share.sharedBy.lastName || ''}`.trim() || share.sharedBy.email || 'Unknown'
          : 'Unknown',
      })),
    };
  }
}
