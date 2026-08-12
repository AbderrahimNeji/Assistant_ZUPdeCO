import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { BrandingService } from './branding.service';
import { PutBrandingDto } from './dto/put-branding.dto';
import { UploadLogoDto } from './dto/upload-logo.dto';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';
import { Roles } from '../../auth/roles.decorator';

interface AuthenticatedRequest {
  user: { uid: string; company_id: string; roles: string[] };
}

@ApiTags('branding')
@ApiBearerAuth('Firebase')
@Controller('branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  private companyId(req: AuthenticatedRequest): string {
    return req.user.company_id;
  }

  @Get()
  @ApiOperation({ summary: 'Get company branding' })
  getBranding(@Request() req: AuthenticatedRequest) {
    return this.brandingService.getBranding(this.companyId(req));
  }

  @Get('complete')
  @ApiOperation({ summary: 'Get complete company branding with all color nuances and themes' })
  getCompleteBranding(@Request() req: AuthenticatedRequest) {
    return this.brandingService.getCompleteBranding(this.companyId(req));
  }

  @Put()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create or update company branding' })
  putBranding(@Body() dto: PutBrandingDto, @Request() req: AuthenticatedRequest) {
    return this.brandingService.putBranding(this.companyId(req), dto, req.user?.uid);
  }

  @Post('logo')
  @Roles('admin', 'manager')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload company logo to Firebase Storage (stored under company-id folder)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiQuery({ name: 'variant', required: false, enum: ['light', 'dark'] })
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Query() dto: UploadLogoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.brandingService.uploadLogo(
      this.companyId(req),
      { buffer: file.buffer, mimetype: file.mimetype, originalname: file.originalname, size: file.size },
      dto.variant,
      req.user?.uid,
    );
  }

  // --- Themes ---
  @Post('themes')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a theme' })
  createTheme(@Body() dto: CreateThemeDto, @Request() req: AuthenticatedRequest) {
    return this.brandingService.createTheme(this.companyId(req), dto, req.user?.uid);
  }

  @Get('themes')
  @ApiOperation({ summary: 'List themes' })
  findAllThemes(@Request() req: AuthenticatedRequest) {
    return this.brandingService.findAllThemes(this.companyId(req));
  }

  @Get('themes/:id')
  @ApiOperation({ summary: 'Get theme by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOneTheme(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.brandingService.findOneTheme(id, this.companyId(req));
  }

  @Patch('themes/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a theme' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateTheme(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateThemeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.brandingService.updateTheme(id, this.companyId(req), dto, req.user?.uid);
  }

  @Delete('themes/:id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a theme' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  removeTheme(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.brandingService.removeTheme(id, this.companyId(req), req.user?.uid);
  }

  // --- Media assets ---
  @Post('media-assets')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a media asset' })
  createMediaAsset(@Body() dto: CreateMediaAssetDto, @Request() req: AuthenticatedRequest) {
    return this.brandingService.createMediaAsset(this.companyId(req), dto, req.user?.uid, req.user?.uid);
  }

  @Get('media-assets')
  @ApiOperation({ summary: 'List media assets' })
  findAllMediaAssets(@Request() req: AuthenticatedRequest) {
    return this.brandingService.findAllMediaAssets(this.companyId(req));
  }

  @Get('media-assets/:id')
  @ApiOperation({ summary: 'Get media asset by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOneMediaAsset(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.brandingService.findOneMediaAsset(id, this.companyId(req));
  }

  @Patch('media-assets/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a media asset' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateMediaAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaAssetDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.brandingService.updateMediaAsset(id, this.companyId(req), dto, req.user?.uid);
  }

  @Delete('media-assets/:id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a media asset' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  removeMediaAsset(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.brandingService.removeMediaAsset(id, this.companyId(req), req.user?.uid);
  }

  // --- Email templates ---
  @Post('email-templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create an email template' })
  createEmailTemplate(@Body() dto: CreateEmailTemplateDto, @Request() req: AuthenticatedRequest) {
    return this.brandingService.createEmailTemplate(this.companyId(req), dto, req.user?.uid);
  }

  @Get('email-templates')
  @ApiOperation({ summary: 'List email templates' })
  findAllEmailTemplates(@Request() req: AuthenticatedRequest) {
    return this.brandingService.findAllEmailTemplates(this.companyId(req));
  }

  @Get('email-templates/:id')
  @ApiOperation({ summary: 'Get email template by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOneEmailTemplate(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.brandingService.findOneEmailTemplate(id, this.companyId(req));
  }

  @Patch('email-templates/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update an email template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateEmailTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmailTemplateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.brandingService.updateEmailTemplate(id, this.companyId(req), dto, req.user?.uid);
  }

  @Delete('email-templates/:id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an email template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  removeEmailTemplate(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.brandingService.removeEmailTemplate(id, this.companyId(req), req.user?.uid);
  }

  // --- Document templates ---
  @Post('document-templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a document template' })
  createDocumentTemplate(@Body() dto: CreateDocumentTemplateDto, @Request() req: AuthenticatedRequest) {
    return this.brandingService.createDocumentTemplate(this.companyId(req), dto, req.user?.uid);
  }

  @Get('document-templates')
  @ApiOperation({ summary: 'List document templates' })
  findAllDocumentTemplates(@Request() req: AuthenticatedRequest) {
    return this.brandingService.findAllDocumentTemplates(this.companyId(req));
  }

  @Get('document-templates/:id')
  @ApiOperation({ summary: 'Get document template by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOneDocumentTemplate(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.brandingService.findOneDocumentTemplate(id, this.companyId(req));
  }

  @Patch('document-templates/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a document template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateDocumentTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentTemplateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.brandingService.updateDocumentTemplate(id, this.companyId(req), dto, req.user?.uid);
  }

  @Delete('document-templates/:id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a document template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  removeDocumentTemplate(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.brandingService.removeDocumentTemplate(id, this.companyId(req), req.user?.uid);
  }
}
