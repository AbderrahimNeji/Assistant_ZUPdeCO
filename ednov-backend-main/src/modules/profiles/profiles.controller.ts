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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Roles } from '../../auth/roles.decorator';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('profiles')
@ApiBearerAuth('Firebase')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a profile for the current company' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  async create(@Body() dto: CreateProfileDto, @Request() req: AuthenticatedRequest) {
    return this.profilesService.create(req.user.company_id, dto, req.user.uid);
  }

  @Get()
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'List all profiles for the current company' })
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.profilesService.findAll(req.user.company_id);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'Get a profile by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.profilesService.findOne(id, req.user.company_id);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a profile' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.profilesService.update(id, req.user.company_id, dto, req.user.uid);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a profile' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.profilesService.remove(id, req.user.company_id, req.user.uid);
  }
}
