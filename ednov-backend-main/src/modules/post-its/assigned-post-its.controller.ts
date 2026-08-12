import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FirebaseJwtGuard } from '../../auth/firebase-jwt.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { AssignedPostItTemplatesService } from './assigned-post-it-templates.service';
import { CreateAssignedPostItDto } from './dto/create-assigned-post-it.dto';
import { BulkAssignedPostItDto, BulkAssignedPostItResultDto } from './dto/bulk-assigned-post-it.dto';
import { AssignedPostItResponseDto } from './dto/assigned-post-it-response.dto';
import { AssignedPostItRecurrence } from './entities/assigned-post-it-template.entity';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('post-its')
@ApiBearerAuth('Firebase')
@Controller('post-its/assigned')
@UseGuards(FirebaseJwtGuard)
export class AssignedPostItsController {
  constructor(
    private readonly assignedPostItTemplatesService: AssignedPostItTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List assigned post-its (admin board view)' })
  @ApiQuery({ name: 'filter', required: false, enum: ['all', 'weekly', 'monthly', 'quarterly', 'annually', 'specific_date'] })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'ISO 8601 — used with filter=specific_date' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'ISO 8601 — used with filter=specific_date' })
  @ApiQuery({ name: 'quarterlyPeriods', required: false, type: [Number], isArray: true, description: 'Filter by quarter periods (1–4)' })
  @ApiResponse({ status: 200, type: [AssignedPostItResponseDto] })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('filter') filter?: AssignedPostItRecurrence | 'all',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('quarterlyPeriods') quarterlyPeriods?: string | string[],
  ): Promise<AssignedPostItResponseDto[]> {
    const periods = quarterlyPeriods
      ? (Array.isArray(quarterlyPeriods) ? quarterlyPeriods : [quarterlyPeriods]).map(Number)
      : undefined;
    return this.assignedPostItTemplatesService.findAllFrontend(
      req.user.company_id,
      filter,
      dateFrom,
      dateTo,
      periods,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin', 'ADMIN')
  @ApiOperation({ summary: '[Admin] Create an assigned post-it' })
  @ApiResponse({ status: 201, type: AssignedPostItResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Admin only' })
  async create(
    @Body() dto: CreateAssignedPostItDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AssignedPostItResponseDto> {
    return this.assignedPostItTemplatesService.createFrontend(
      dto,
      req.user.uid,
      req.user.company_id,
    );
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'ADMIN')
  @ApiOperation({ summary: '[Admin] Bulk reassign recurrence/role on selected post-its' })
  @ApiResponse({ status: 200, type: BulkAssignedPostItResultDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Admin only' })
  async bulkAction(
    @Body() dto: BulkAssignedPostItDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<BulkAssignedPostItResultDto> {
    return this.assignedPostItTemplatesService.bulkActionFrontend(dto, req.user.company_id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'ADMIN')
  @ApiOperation({ summary: '[Admin] Update an assigned post-it' })
  @ApiResponse({ status: 200, type: AssignedPostItResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 403, description: 'Admin only' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAssignedPostItDto>,
    @Request() req: AuthenticatedRequest,
  ): Promise<AssignedPostItResponseDto> {
    return this.assignedPostItTemplatesService.updateFrontend(id, dto, req.user.company_id);
  }
}
