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
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RoleInterfaceBindingsService } from './role-interface-bindings.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateRoleGroupDto, UpdateRoleGroupDto } from './dto/role-group.dto';
import { ReplaceRoleInterfaceBindingsDto } from './dto/replace-role-interface-bindings.dto';
import { Roles } from '../../auth/roles.decorator';
import { WithActionScopes, WriteScope } from '../../common/visibility/action-scope.decorator';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
  visibilityScope?: VisibilityScope | null;
  actionScopes?: Record<string, VisibilityScope | null>;
}

@ApiTags('roles')
@ApiBearerAuth('Firebase')
@Controller('roles')
@Roles('admin', 'manager', 'coordinator', 'volunteer')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly roleInterfaceBindingsService: RoleInterfaceBindingsService,
  ) {}

  // ─── Role Groups ─────────────────────────────────────────────────────────

  @Get('groups')
  @Roles() // Allow all authenticated users to view role groups
  @ApiOperation({ summary: 'List all role groups for the current company' })
  async findAllGroups(@Request() req: AuthenticatedRequest) {
    return this.rolesService.findAllGroups(req.user.company_id);
  }

  @Post('groups')
  @Roles('admin', 'ADMIN')
  @ApiOperation({ summary: 'Create a role group' })
  @ApiResponse({ status: 201, description: 'Role group created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  async createGroup(@Body() dto: CreateRoleGroupDto, @Request() req: AuthenticatedRequest) {
    return this.rolesService.createGroup(req.user.company_id, dto, req.user.uid);
  }

  @Patch('groups/:id')
  @Roles('admin', 'ADMIN')
  @ApiOperation({ summary: 'Update a role group (non-system only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async updateGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleGroupDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rolesService.updateGroup(id, req.user.company_id, dto, req.user.uid);
  }

  @Delete('groups/:id')
  @Roles('admin', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role group (non-system only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async removeGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.rolesService.removeGroup(id, req.user.company_id, req.user.uid);
  }

  // ─── Roles ───────────────────────────────────────────────────────────────

  @Post()
  @Roles('admin', 'ADMIN', 'manager', 'MANAGER')
  @ApiOperation({ summary: 'Create a role for the current company' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Role code already exists' })
  async create(@Body() dto: CreateRoleDto, @Request() req: AuthenticatedRequest) {
    return this.rolesService.create(req.user.company_id, dto, req.user.uid);
  }

  @Get()
  @Roles() // Allow all authenticated users to view roles (needed for dynamic menus)
  @WithActionScopes([
    { elementId: 'action-edit-row', interfaceName: 'roles' },
    { elementId: 'action-delete-row', interfaceName: 'roles' },
    { elementId: 'action-duplicate', interfaceName: 'roles' },
  ])
  @ApiOperation({ summary: 'List all roles for the current company' })
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.rolesService.findAll(req.user.company_id, req.visibilityScope, req.actionScopes);
  }

  @Get(':id/interface-elements')
  @Roles('admin', 'ADMIN', 'manager', 'MANAGER')
  @ApiOperation({ summary: 'List interface element bindings for a role' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getRoleInterfaceBindings(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.roleInterfaceBindingsService.listBindings(req.user.company_id, id);
  }

  @Put(':id/interface-elements')
  @Roles('admin', 'ADMIN', 'manager', 'MANAGER')
  @ApiOperation({ summary: 'Replace all interface element bindings for a role (non-system only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async replaceRoleInterfaceBindings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceRoleInterfaceBindingsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.roleInterfaceBindingsService.replaceBindings(
      req.user.company_id,
      id,
      dto.bindings,
      req.user.uid,
    );
    return this.roleInterfaceBindingsService.listBindings(req.user.company_id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rolesService.findOne(id, req.user.company_id);
  }

  @Patch(':id')
  @WriteScope('action-edit-row', 'roles')
  @Roles('admin', 'ADMIN', 'manager', 'MANAGER')
  @ApiOperation({ summary: 'Update a role (non-system only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rolesService.update(id, req.user.company_id, dto, req.user.uid, req.actionScopes?.['action-edit-row']);
  }

  @Delete(':id')
  @WriteScope('action-delete-row', 'roles')
  @Roles('admin', 'ADMIN', 'manager', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a role (non-system only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.rolesService.remove(id, req.user.company_id, req.user.uid, req.actionScopes?.['action-delete-row']);
  }
}
