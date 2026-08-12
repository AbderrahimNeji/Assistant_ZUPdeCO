import { Controller, Get, Put, Patch, Body, Param, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserPreferencesService } from './user-preferences.service';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UpdateInterfaceConfigDto } from './dto/update-interface-config.dto';
import { UserPreferencesResponseDto } from './dto/user-preferences-response.dto';
import { RequestUserPayload } from '../../auth/auth.service';

// Decorator to extract user from request (FirebaseJwtGuard is global in AppModule)
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('User Preferences')
@ApiBearerAuth()
@Controller('user-preferences')
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved successfully', type: UserPreferencesResponseDto })
  async getUserPreferences(@CurrentUser() user: RequestUserPayload): Promise<UserPreferencesResponseDto> {
    return this.userPreferencesService.getUserPreferences(user.id, user.companyId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user preferences (global)' })
  @ApiResponse({ status: 200, description: 'User preferences updated successfully', type: UserPreferencesResponseDto })
  async updateUserPreferences(
    @CurrentUser() user: RequestUserPayload,
    @Body() dto: UpdateUserPreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    return this.userPreferencesService.updateUserPreferences(user.id, user.companyId, dto);
  }

  @Patch('interface/:interfaceName')
  @ApiOperation({ summary: 'Update configuration for a specific interface' })
  @ApiResponse({ status: 200, description: 'Interface configuration updated successfully', type: UserPreferencesResponseDto })
  async updateInterfaceConfig(
    @CurrentUser() user: RequestUserPayload,
    @Param('interfaceName') interfaceName: string,
    @Body() dto: UpdateInterfaceConfigDto,
  ): Promise<UserPreferencesResponseDto> {
    return this.userPreferencesService.updateInterfaceConfig(user.id, user.companyId, interfaceName, dto);
  }
}
