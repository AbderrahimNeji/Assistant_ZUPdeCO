import { Controller, Get, Put, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { PutSettingsDto } from './dto/put-settings.dto';
import { PutFeatureFlagsDto } from './dto/put-feature-flags.dto';
import { Roles } from '../../auth/roles.decorator';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('settings')
@ApiBearerAuth('Firebase')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'Get company settings (key-value)' })
  @ApiResponse({ status: 200, description: 'Company settings key-value map' })
  async getSettings(@Request() req: AuthenticatedRequest) {
    return this.settingsService.getSettings(req.user.company_id);
  }

  @Put()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Upsert company settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async putSettings(
    @Body() dto: PutSettingsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.settingsService.putSettings(req.user.company_id, dto, req.user?.uid);
  }

  @Get('feature-flags')
  @Roles('admin', 'manager', 'coordinator')
  @ApiOperation({ summary: 'Get company feature flags' })
  @ApiResponse({ status: 200, description: 'List of feature flags' })
  async getFeatureFlags(@Request() req: AuthenticatedRequest) {
    return this.settingsService.getFeatureFlags(req.user.company_id);
  }

  @Put('feature-flags')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Upsert company feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags updated' })
  async putFeatureFlags(
    @Body() dto: PutFeatureFlagsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.settingsService.putFeatureFlags(req.user.company_id, dto, req.user?.uid);
  }
}
