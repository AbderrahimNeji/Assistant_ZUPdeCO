import { Controller, Get, Param, Query, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { PedagogicalResource } from './entities/pedagogical-resource.entity';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('resources')
@ApiBearerAuth('Firebase')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'List pedagogical resources (paginated, optional filters)' })
  @ApiResponse({ status: 200, description: 'Paginated list of resources' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListResourcesQueryDto,
  ) {
    return this.resourcesService.findAll(req.user.company_id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a resource by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Resource detail' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<PedagogicalResource> {
    return this.resourcesService.findOne(id, req.user.company_id);
  }
}
