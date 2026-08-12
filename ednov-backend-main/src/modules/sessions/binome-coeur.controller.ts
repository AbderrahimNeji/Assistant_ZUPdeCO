import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BinomeCoeurService } from './binome-coeur.service';
import { CreateBinomeCoeurDto } from './dto/create-binome-coeur.dto';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('companies')
@ApiBearerAuth('Firebase')
@Controller('companies/:companyId/binome-coeur')
export class BinomeCoeurController {
  constructor(private readonly binomeCoeurService: BinomeCoeurService) {}

  @Post()
  @ApiOperation({ summary: 'Create a binôme cœur (manual pair student–tutor for an establishment/subject)' })
  @ApiParam({ name: 'companyId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Binôme cœur created' })
  @ApiResponse({ status: 409, description: 'Binôme cœur already exists' })
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateBinomeCoeurDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.company_id !== companyId) {
      throw new ForbiddenException('Company mismatch');
    }
    return this.binomeCoeurService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List binômes cœur for the company (optional filters: establishmentId, subjectId)' })
  @ApiParam({ name: 'companyId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'establishmentId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'classId', required: false, description: 'Filter by student school class (user_profiles.school_class_id)' })
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('establishmentId') establishmentId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('classId') classId?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    if (req && req.user.company_id !== companyId) {
      throw new ForbiddenException('Company mismatch');
    }
    return this.binomeCoeurService.findAll(
      companyId,
      establishmentId ?? undefined,
      subjectId ?? undefined,
      classId ?? undefined,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a binôme cœur' })
  @ApiParam({ name: 'companyId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.company_id !== companyId) {
      throw new ForbiddenException('Company mismatch');
    }
    await this.binomeCoeurService.remove(id, companyId);
  }
}
