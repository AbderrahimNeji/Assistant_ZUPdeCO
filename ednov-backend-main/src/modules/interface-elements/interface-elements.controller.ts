import { Controller, Get, Param, Query, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InterfaceElementsService } from './interface-elements.service';
import { InterfaceElementResponseDto } from './dto/interface-element-response.dto';
import { RequestUserPayload } from '../../auth/auth.service';
import { UserPreferencesService } from '../user-preferences/user-preferences.service';
import { InterfaceElementsQueryDto } from './dto/interface-elements-query.dto';
import { Roles } from '../../auth/roles.decorator';

// Decorator to extract user from request (FirebaseJwtGuard is global in AppModule)
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('Interface Elements')
@ApiBearerAuth()
@Controller('interface-elements')
export class InterfaceElementsController {
  constructor(
    private readonly interfaceElementsService: InterfaceElementsService,
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get ALL interface elements grouped by interface name (bulk load for login)' })
  @ApiResponse({ 
    status: 200, 
    description: 'All interface elements grouped by interface name',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: { $ref: '#/components/schemas/InterfaceElementResponseDto' }
      }
    }
  })
  async getAllInterfaceElements(
    @CurrentUser() user: RequestUserPayload,
  ): Promise<Record<string, InterfaceElementResponseDto[]>> {
    // Get user preferences
    const preferences = await this.userPreferencesService.getUserPreferences(
      user.id,
      user.companyId,
    );

    // Get ALL elements grouped by interface
    return this.interfaceElementsService.getAllInterfaceElementsGrouped(
      user.companyId,
      user.roleCodes || [],
      preferences.interfaceConfigs ?? {},
    );
  }

  @Get('all-for-builder')
  @Roles('admin', 'ADMIN', 'manager', 'MANAGER')
  @ApiOperation({ summary: 'Get ALL interface elements for the role permissions builder (no role filtering)' })
  @ApiResponse({ 
    status: 200, 
    description: 'All interface elements grouped by interface name (unfiltered)',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: { $ref: '#/components/schemas/InterfaceElementResponseDto' }
      }
    }
  })
  async getAllElementsForBuilder(
    @CurrentUser() user: RequestUserPayload,
  ): Promise<Record<string, InterfaceElementResponseDto[]>> {
    return this.interfaceElementsService.getAllInterfaceElementsForBuilder(user.companyId);
  }

  @Get(':interfaceName')
  @ApiOperation({ summary: 'Get available elements for an interface based on user roles and preferences' })
  @ApiParam({ name: 'interfaceName', description: 'Interface name (dashboard, sessions, etc.)' })
  @ApiResponse({ status: 200, description: 'Interface elements', type: [InterfaceElementResponseDto] })
  async getInterfaceElements(
    @Param('interfaceName') interfaceName: string,
    @Query() query: InterfaceElementsQueryDto,
    @CurrentUser() user: RequestUserPayload,
  ): Promise<InterfaceElementResponseDto[]> {
    // Get user preferences
    const preferences = await this.userPreferencesService.getUserPreferences(
      user.id,
      user.companyId,
    );

    const interfaceConfigs = preferences.interfaceConfigs ?? {};
    const userPreferencesWithEstablishmentIds =
      query.establishmentIds?.length
        ? { ...interfaceConfigs, establishmentIds: query.establishmentIds }
        : interfaceConfigs;

    // Get elements with role permissions and user customizations
    return this.interfaceElementsService.getInterfaceElements(
      interfaceName,
      user.companyId,
      user.roleCodes || [],
      userPreferencesWithEstablishmentIds,
    );
  }
}
