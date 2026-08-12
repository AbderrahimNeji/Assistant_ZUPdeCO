import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { Roles } from '../../auth/roles.decorator';
import { GamificationService } from './gamification.service';
import { CreateGamificationNiveauDto } from './dto/create-gamification-niveau.dto';
import { UpdateGamificationNiveauDto } from './dto/update-gamification-niveau.dto';
import { CreateGamificationBadgeDto } from './dto/create-gamification-badge.dto';
import { UpdateGamificationBadgeDto } from './dto/update-gamification-badge.dto';
import { CreateGamificationXpRegleDto } from './dto/create-gamification-xp-regle.dto';
import { UpdateGamificationXpRegleDto } from './dto/update-gamification-xp-regle.dto';
import { ToggleGamificationDto } from './dto/toggle-gamification.dto';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('gamification-admin')
@ApiBearerAuth('Firebase')
@Controller('admin/gamification')
@Roles('admin', 'manager')
export class GamificationAdminController {
  constructor(private readonly gamificationService: GamificationService) {}

  private companyId(req: AuthenticatedRequest): string {
    return req.user.company_id;
  }

  @Get('niveaux')
  @ApiOperation({ summary: 'List gamification levels (admin)' })
  @ApiResponse({ status: 200, description: 'List of niveaux' })
  getNiveaux(@Request() req: AuthenticatedRequest) {
    return this.gamificationService.findNiveaux(this.companyId(req));
  }

  @Post('niveaux')
  @ApiOperation({ summary: 'Create a gamification level (admin)' })
  @ApiResponse({ status: 201, description: 'Niveau created' })
  createNiveau(@Request() req: AuthenticatedRequest, @Body() dto: CreateGamificationNiveauDto) {
    return this.gamificationService.createNiveau(this.companyId(req), dto);
  }

  @Patch('niveaux/:id')
  @ApiOperation({ summary: 'Update a gamification level (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateNiveau(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGamificationNiveauDto,
  ) {
    return this.gamificationService.updateNiveau(this.companyId(req), id, dto);
  }

  @Delete('niveaux/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a gamification level (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  deleteNiveau(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.gamificationService.deleteNiveau(this.companyId(req), id);
  }

  @Get('badges')
  @ApiOperation({ summary: 'List gamification badges (admin)' })
  @ApiResponse({ status: 200, description: 'List of badges' })
  getBadges(@Request() req: AuthenticatedRequest) {
    return this.gamificationService.findBadges(this.companyId(req));
  }

  @Post('badges')
  @ApiOperation({ summary: 'Create a gamification badge (admin)' })
  @ApiResponse({ status: 201, description: 'Badge created' })
  createBadge(@Request() req: AuthenticatedRequest, @Body() dto: CreateGamificationBadgeDto) {
    return this.gamificationService.createBadge(this.companyId(req), dto);
  }

  @Patch('badges/:id')
  @ApiOperation({ summary: 'Update a gamification badge (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateBadge(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGamificationBadgeDto,
  ) {
    return this.gamificationService.updateBadge(this.companyId(req), id, dto);
  }

  @Delete('badges/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a gamification badge (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  deleteBadge(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.gamificationService.deleteBadge(this.companyId(req), id);
  }

  @Get('xp-rules')
  @ApiOperation({ summary: 'List XP rules (admin)' })
  @ApiResponse({ status: 200, description: 'List of xp regles' })
  getXpRules(@Request() req: AuthenticatedRequest) {
    return this.gamificationService.findXpRegles(this.companyId(req));
  }

  @Post('xp-rules')
  @ApiOperation({ summary: 'Create an XP rule (admin)' })
  @ApiResponse({ status: 201, description: 'XP rule created' })
  createXpRegle(@Request() req: AuthenticatedRequest, @Body() dto: CreateGamificationXpRegleDto) {
    return this.gamificationService.createXpRegle(this.companyId(req), dto);
  }

  @Patch('xp-rules/:id')
  @ApiOperation({ summary: 'Update an XP rule (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateXpRegle(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGamificationXpRegleDto,
  ) {
    return this.gamificationService.updateXpRegle(this.companyId(req), id, dto);
  }

  @Delete('xp-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an XP rule (admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  deleteXpRegle(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.gamificationService.deleteXpRegle(this.companyId(req), id);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle active state of a niveau, badge or xp_regle (admin)' })
  @ApiResponse({ status: 200, description: 'Updated entity' })
  toggle(@Request() req: AuthenticatedRequest, @Body() dto: ToggleGamificationDto) {
    return this.gamificationService.toggle(
      dto.type,
      dto.id,
      this.companyId(req),
      dto.isActive,
    );
  }
}
