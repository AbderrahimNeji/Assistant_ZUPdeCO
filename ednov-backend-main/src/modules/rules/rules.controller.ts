import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { CreateRuleOverrideDto } from './dto/create-rule-override.dto';
import { UpdateRuleOverrideDto } from './dto/update-rule-override.dto';
import { Roles } from '../../auth/roles.decorator';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('rules')
@ApiBearerAuth('Firebase')
@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a rule' })
  create(@Body() dto: CreateRuleDto, @Request() req: AuthenticatedRequest) {
    return this.rulesService.create(req.user.company_id, dto, req.user?.uid);
  }

  @Get()
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'List rules' })
  findAll(@Request() req: AuthenticatedRequest) {
    return this.rulesService.findAll(req.user.company_id);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'Get rule by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.rulesService.findOne(id, req.user.company_id);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a rule' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRuleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rulesService.update(id, req.user.company_id, dto, req.user?.uid);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rule' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.rulesService.remove(id, req.user.company_id, req.user?.uid);
  }

  @Get(':id/overrides')
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'List overrides for a rule' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOverrides(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.rulesService.findOverrides(id, req.user.company_id);
  }

  @Post(':id/overrides')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a rule override' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRuleOverrideDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rulesService.createOverride(id, req.user.company_id, dto, req.user?.uid);
  }

  @Get(':id/overrides/:overrideId')
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'Get rule override by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'overrideId', type: 'string', format: 'uuid' })
  findOneOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rulesService.findOneOverride(id, overrideId, req.user.company_id);
  }

  @Patch(':id/overrides/:overrideId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a rule override' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'overrideId', type: 'string', format: 'uuid' })
  updateOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @Body() dto: UpdateRuleOverrideDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rulesService.updateOverride(id, overrideId, req.user.company_id, dto, req.user?.uid);
  }

  @Delete(':id/overrides/:overrideId')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rule override' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'overrideId', type: 'string', format: 'uuid' })
  removeOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rulesService.removeOverride(id, overrideId, req.user.company_id, req.user?.uid);
  }
}
