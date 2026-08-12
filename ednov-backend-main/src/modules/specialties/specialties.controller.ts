import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { ReorderSpecialtiesDto } from './dto/reorder-specialties.dto';
import { LinkedElement } from '../../common/visibility/linked-element.decorator';
import { WithActionScopes } from '../../common/visibility/action-scope.decorator';
import { WriteScope } from '../../common/visibility/action-scope.decorator';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('specialties')
@ApiBearerAuth('Firebase')
@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get('levels/high')
  @ApiOperation({ summary: 'Get active high-school (lycée) levels for the current company' })
  getHighSchoolLevels(@Request() req: AuthenticatedRequest) {
    return this.specialtiesService.findHighSchoolLevels(req.user.company_id);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder specialties by providing an ordered list of IDs' })
  reorder(@Body() dto: ReorderSpecialtiesDto) {
    return this.specialtiesService.reorder(dto.ids);
  }

  @Get()
  @LinkedElement('menu-specialties', 'sidebar')
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'specialties' },
    { elementId: 'action-delete-row', interfaceName: 'specialties' },
  ])
  @ApiOperation({ summary: 'List specialties (global referential); activeOnly=true for selectable options' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  findAll(
    @Query('activeOnly') activeOnly?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const only = activeOnly === 'true' || activeOnly === '1';
    return this.specialtiesService.findAll(
      only,
      req?.user?.company_id || '',
      (req as any)?.visibilityScope ?? null,
      { userId: req?.user?.uid || '', companyId: req?.user?.company_id || '' },
      (req as any)?.actionScopes,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specialty by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.specialtiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a specialty' })
  create(@Body() dto: CreateSpecialtyDto, @Request() _req: AuthenticatedRequest) {
    return this.specialtiesService.create(dto);
  }

  @Patch(':id')
  @WriteScope('action-edit-row', 'specialties')
  @ApiOperation({ summary: 'Update a specialty' })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpecialtyDto,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.specialtiesService.update(
      id,
      dto,
      (req as any)?.actionScopes?.['action-edit-row'],
    );
  }

  @Delete(':id')
  @WriteScope('action-delete-row', 'specialties')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specialty' })
  @ApiParam({ name: 'id', format: 'uuid' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.specialtiesService.remove(
      id,
      (req as any)?.actionScopes?.['action-delete-row'],
    );
  }
}
