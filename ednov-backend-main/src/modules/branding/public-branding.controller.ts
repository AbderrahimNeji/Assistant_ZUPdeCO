import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { BrandingService } from './branding.service';

@ApiTags('branding (public)')
@Controller('public/branding')
@Public()
export class PublicBrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get(':companyId')
  @ApiOperation({
    summary: 'Get complete public branding by company id (no auth)',
    description: 'Returns full branding (logos, colors, theme) for the app. Use before login so the login page has correct branding.',
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID (e.g. 354eb5d0-17a4-4906-8b27-7c6339bdcd70)' })
  @ApiResponse({ status: 200, description: 'Complete branding (logos, colors, customCss, fonts)' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  getByCompanyId(@Param('companyId') companyId: string) {
    return this.brandingService.getPublicCompleteBrandingByCompanyId(companyId);
  }
}
