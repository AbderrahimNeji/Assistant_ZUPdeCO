import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { Branding } from './entities/branding.entity';
import { Theme } from './entities/theme.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { DocumentTemplate } from './entities/document-template.entity';
import { UiConfiguration } from './entities/ui-configuration.entity';
import { AuditLogService } from '../audit/audit.service';
import { PutBrandingDto } from './dto/put-branding.dto';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';

export interface PublicBrandingDto {
  logoUrl: string | null;
  logoDarkUrl: string | null;
  theme: Record<string, unknown> | null;
  uiConfig: Record<string, unknown>;
}

interface ModeValue {
  light: string | null;
  dark: string | null;
}

interface ColorWithNuances {
  nuance1: ModeValue;
  nuance2: ModeValue;
  nuance3: ModeValue;
}

export interface CompleteBrandingDto {
  /** Primary (tint) from color1.nuance1 — used by app theme-only branch */
  primary?: string;
  /** Accent from color3.nuance1 — used by app theme-only branch */
  accent?: string;
  /** Branding row updated_at (ISO) — app uses for logo URL cache-busting */
  updatedAt?: string;
  /** Company name from companies.name */
  companyName?: string | null;
  /** Company country from companies.country (full name like "France") */
  companyCountry?: string | null;
  logos: {
    logo1: ModeValue;
    logo2: ModeValue;
    logo3: ModeValue;
    favicon: string | null;
  };
  colors: {
    color1: ColorWithNuances;
    color2: ColorWithNuances;
    color3: ColorWithNuances;
  };
  customCss: string | null;
  fontFamily: string | null;
  fontUrl: string | null;
}

@Injectable()
export class BrandingService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Branding)
    private readonly brandingRepository: Repository<Branding>,
    @InjectRepository(Theme)
    private readonly themeRepository: Repository<Theme>,
    @InjectRepository(MediaAsset)
    private readonly mediaAssetRepository: Repository<MediaAsset>,
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(DocumentTemplate)
    private readonly documentTemplateRepository: Repository<DocumentTemplate>,
    @InjectRepository(UiConfiguration)
    private readonly uiConfigRepository: Repository<UiConfiguration>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getBranding(companyId: string): Promise<Branding | null> {
    return this.brandingRepository.findOne({ where: { companyId } });
  }

  async getCompleteBranding(companyId: string): Promise<CompleteBrandingDto> {
    const branding = await this.brandingRepository.findOne({ where: { companyId } });
    const lightTheme = await this.themeRepository.findOne({
      where: { companyId, mode: 'light', isActive: true },
    });
    const darkTheme = await this.themeRepository.findOne({
      where: { companyId, mode: 'dark', isActive: true },
    });

    // Prefer branding table over theme table so PUT /branding is the single source of truth
    const color1Nuance1Light = branding?.lightColor1Nuance1 ?? (lightTheme?.variables?.['color1Nuance1'] as string) ?? null;
    const color1Nuance1Dark = branding?.darkColor1Nuance1 ?? (darkTheme?.variables?.['color1Nuance1'] as string) ?? null;
    const color3Nuance1Light = branding?.lightColor3Nuance1 ?? (lightTheme?.variables?.['color3Nuance1'] as string) ?? null;
    const color3Nuance1Dark = branding?.darkColor3Nuance1 ?? (darkTheme?.variables?.['color3Nuance1'] as string) ?? null;

    const colors = {
      color1: {
        nuance1: {
          light: color1Nuance1Light,
          dark: color1Nuance1Dark,
        },
        nuance2: {
          light: branding?.lightColor1Nuance2 ?? (lightTheme?.variables?.['color1Nuance2'] as string) ?? null,
          dark: branding?.darkColor1Nuance2 ?? (darkTheme?.variables?.['color1Nuance2'] as string) ?? null,
        },
        nuance3: {
          light: branding?.lightColor1Nuance3 ?? (lightTheme?.variables?.['color1Nuance3'] as string) ?? null,
          dark: branding?.darkColor1Nuance3 ?? (darkTheme?.variables?.['color1Nuance3'] as string) ?? null,
        },
      },
      color2: {
        nuance1: {
          light: branding?.lightColor2Nuance1 ?? (lightTheme?.variables?.['color2Nuance1'] as string) ?? null,
          dark: branding?.darkColor2Nuance1 ?? (darkTheme?.variables?.['color2Nuance1'] as string) ?? null,
        },
        nuance2: {
          light: branding?.lightColor2Nuance2 ?? (lightTheme?.variables?.['color2Nuance2'] as string) ?? null,
          dark: branding?.darkColor2Nuance2 ?? (darkTheme?.variables?.['color2Nuance2'] as string) ?? null,
        },
        nuance3: {
          light: branding?.lightColor2Nuance3 ?? (lightTheme?.variables?.['color2Nuance3'] as string) ?? null,
          dark: branding?.darkColor2Nuance3 ?? (darkTheme?.variables?.['color2Nuance3'] as string) ?? null,
        },
      },
      color3: {
        nuance1: {
          light: color3Nuance1Light,
          dark: color3Nuance1Dark,
        },
        nuance2: {
          light: branding?.lightColor3Nuance2 ?? (lightTheme?.variables?.['color3Nuance2'] as string) ?? null,
          dark: branding?.darkColor3Nuance2 ?? (darkTheme?.variables?.['color3Nuance2'] as string) ?? null,
        },
        nuance3: {
          light: branding?.lightColor3Nuance3 ?? (lightTheme?.variables?.['color3Nuance3'] as string) ?? null,
          dark: branding?.darkColor3Nuance3 ?? (darkTheme?.variables?.['color3Nuance3'] as string) ?? null,
        },
      },
    };

    const primary = color1Nuance1Light ?? color1Nuance1Dark ?? null;
    const accent = color3Nuance1Light ?? color3Nuance1Dark ?? primary;

    return {
      primary: primary ?? undefined,
      accent: accent ?? undefined,
      updatedAt: branding?.updatedAt?.toISOString?.() ?? undefined,
      logos: {
        logo1: {
          light: branding?.logo1LightUrl ?? branding?.logoUrl ?? null,
          dark: branding?.logo1DarkUrl ?? branding?.logoDarkUrl ?? null,
        },
        logo2: {
          light: branding?.logo2LightUrl ?? null,
          dark: branding?.logo2DarkUrl ?? null,
        },
        logo3: {
          light: branding?.logo3LightUrl ?? null,
          dark: branding?.logo3DarkUrl ?? null,
        },
        favicon: branding?.faviconUrl ?? null,
      },
      colors,
      customCss: branding?.customCss ?? null,
      fontFamily: branding?.fontFamily ?? null,
      fontUrl: branding?.fontUrl ?? null,
    };
  }

  async putBranding(companyId: string, dto: PutBrandingDto, actorId?: string): Promise<Branding> {
    let branding = await this.brandingRepository.findOne({ where: { companyId } });
    const oldValue = branding ? ({ ...branding } as unknown as Record<string, unknown>) : undefined;
    if (branding) {
      Object.assign(branding, dto);
      branding = await this.brandingRepository.save(branding);
    } else {
      branding = this.brandingRepository.create({ ...dto, companyId } as DeepPartial<Branding>);
      branding = await this.brandingRepository.save(branding);
    }
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'brandings',
      entityId: branding.id,
      action: oldValue ? 'UPDATE' : 'CREATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return branding;
  }

  private static readonly LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
  private static readonly LOGO_ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/svg+xml'];

  /** Storage path for logo under company folder: {companyId}/logo.png or {companyId}/logo-dark.png */
  private getLogoStoragePath(companyId: string, variant?: 'light' | 'dark'): string {
    const ext = variant === 'dark' ? 'logo-dark' : 'logo';
    return `${companyId}/${ext}`;
  }

  private getExtensionFromMime(mimetype: string): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/svg+xml': 'svg',
    };
    return map[mimetype] ?? 'png';
  }

  async uploadLogo(
    companyId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    variant?: 'light' | 'dark',
    actorId?: string,
  ): Promise<{ url: string; logoUrl?: string; logoDarkUrl?: string }> {
    if (!file?.buffer || file.size === 0) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > BrandingService.LOGO_MAX_SIZE_BYTES) {
      throw new BadRequestException(`File size must not exceed ${BrandingService.LOGO_MAX_SIZE_BYTES / 1024 / 1024}MB`);
    }
    if (!BrandingService.LOGO_ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${BrandingService.LOGO_ALLOWED_MIMES.join(', ')}`,
      );
    }

    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = admin.storage().bucket(bucketName);
    const ext = this.getExtensionFromMime(file.mimetype);
    const pathBase = this.getLogoStoragePath(companyId, variant);
    const storagePath = ext ? `${pathBase}.${ext}` : pathBase;

    const storageFile = bucket.file(storagePath);
    await storageFile.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });
    await storageFile.makePublic();
    const url = storageFile.publicUrl();

    const dto: PutBrandingDto = {};
    if (variant === 'dark') {
      dto.logo1DarkUrl = url;
      dto.logoDarkUrl = url;
    } else {
      dto.logo1LightUrl = url;
      dto.logoUrl = url;
    }
    await this.putBranding(companyId, dto, actorId);

    return {
      url,
      ...(dto.logoUrl && { logoUrl: dto.logoUrl }),
      ...(dto.logoDarkUrl && { logoDarkUrl: dto.logoDarkUrl }),
    };
  }

  async getPublicByCompanyCode(companyCode: string): Promise<PublicBrandingDto> {
    const company = await this.companyRepository
      .createQueryBuilder('c')
      .where('LOWER(c.code) = LOWER(:code)', { code: companyCode })
      .andWhere('c.deleted_at IS NULL')
      .getOne();
    if (!company) {
      throw new NotFoundException(`Company with code "${companyCode}" not found`);
    }
    const companyId = company.id;

    const branding = await this.brandingRepository.findOne({ where: { companyId } });
    const defaultTheme = await this.themeRepository.findOne({
      where: { companyId, isDefault: true, isActive: true },
    });
    const uiConfig = await this.uiConfigRepository.findOne({ where: { companyId } });

    return {
      logoUrl: branding?.logoUrl ?? company.logoUrl ?? null,
      logoDarkUrl: branding?.logoDarkUrl ?? null,
      theme: defaultTheme
        ? {
            code: defaultTheme.code,
            mode: defaultTheme.mode,
            variables: defaultTheme.variables,
          }
        : null,
      uiConfig: uiConfig
        ? {
            showLogoInHeader: uiConfig.showLogoInHeader,
            showCompanyName: uiConfig.showCompanyName,
            enableDarkModeToggle: uiConfig.enableDarkModeToggle,
            defaultLanguage: uiConfig.defaultLanguage,
            availableLanguages: uiConfig.availableLanguages,
            dashboardLayout: uiConfig.dashboardLayout,
          }
        : {},
    };
  }

  /**
   * Returns full branding (logos, colors, etc.) by company id. No auth.
   * Used by the login page / BrandingProvider. Frontend passes VITE_COMPANY_ID (UUID).
   */
  async getPublicCompleteBrandingByCompanyId(companyId: string): Promise<CompleteBrandingDto> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with id "${companyId}" not found`);
    }
    const branding = await this.getCompleteBranding(companyId);
    return {
      ...branding,
      companyName: company.name ?? null,
      companyCountry: company.country ?? null,
    };
  }

  // --- Themes ---
  async createTheme(companyId: string, dto: CreateThemeDto, actorId?: string): Promise<Theme> {
    const existing = await this.themeRepository.findOne({ where: { companyId, code: dto.code } });
    if (existing) throw new ConflictException(`Theme code "${dto.code}" already exists`);
    const entity = this.themeRepository.create({ ...dto, companyId });
    const saved = await this.themeRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'themes',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAllThemes(companyId: string): Promise<Theme[]> {
    return this.themeRepository.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async findOneTheme(id: string, companyId: string): Promise<Theme> {
    const theme = await this.themeRepository.findOne({ where: { id, companyId } });
    if (!theme) throw new NotFoundException(`Theme ${id} not found`);
    return theme;
  }

  async updateTheme(id: string, companyId: string, dto: UpdateThemeDto, actorId?: string): Promise<Theme> {
    const theme = await this.findOneTheme(id, companyId);
    const oldValue = { ...theme } as unknown as Record<string, unknown>;
    Object.assign(theme, dto);
    const saved = await this.themeRepository.save(theme);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'themes',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeTheme(id: string, companyId: string, actorId?: string): Promise<void> {
    const theme = await this.findOneTheme(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'themes',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: theme.id, code: theme.code } as Record<string, unknown>,
    });
    await this.themeRepository.softDelete(id);
  }

  // --- Media assets ---
  async createMediaAsset(companyId: string, dto: CreateMediaAssetDto, createdById: string | undefined, actorId?: string): Promise<MediaAsset> {
    const entity = this.mediaAssetRepository.create({
      ...dto,
      companyId,
      createdById: createdById ?? null,
      type: dto.type as 'logo' | 'icon' | 'banner' | 'document' | 'email_template',
    });
    const saved = await this.mediaAssetRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'media_assets',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAllMediaAssets(companyId: string): Promise<MediaAsset[]> {
    return this.mediaAssetRepository.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async findOneMediaAsset(id: string, companyId: string): Promise<MediaAsset> {
    const asset = await this.mediaAssetRepository.findOne({ where: { id, companyId } });
    if (!asset) throw new NotFoundException(`Media asset ${id} not found`);
    return asset;
  }

  async updateMediaAsset(id: string, companyId: string, dto: UpdateMediaAssetDto, actorId?: string): Promise<MediaAsset> {
    const asset = await this.findOneMediaAsset(id, companyId);
    const oldValue = { ...asset } as unknown as Record<string, unknown>;
    Object.assign(asset, dto);
    const saved = await this.mediaAssetRepository.save(asset);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'media_assets',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeMediaAsset(id: string, companyId: string, actorId?: string): Promise<void> {
    const asset = await this.findOneMediaAsset(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'media_assets',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: asset.id } as Record<string, unknown>,
    });
    await this.mediaAssetRepository.softDelete(id);
  }

  // --- Email templates ---
  async createEmailTemplate(companyId: string, dto: CreateEmailTemplateDto, actorId?: string): Promise<EmailTemplate> {
    const existing = await this.emailTemplateRepository.findOne({ where: { companyId, code: dto.code } });
    if (existing) throw new ConflictException(`Email template code "${dto.code}" already exists`);
    const entity = this.emailTemplateRepository.create({ ...dto, companyId });
    const saved = await this.emailTemplateRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'email_templates',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAllEmailTemplates(companyId: string): Promise<EmailTemplate[]> {
    return this.emailTemplateRepository.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async findOneEmailTemplate(id: string, companyId: string): Promise<EmailTemplate> {
    const t = await this.emailTemplateRepository.findOne({ where: { id, companyId } });
    if (!t) throw new NotFoundException(`Email template ${id} not found`);
    return t;
  }

  async updateEmailTemplate(id: string, companyId: string, dto: UpdateEmailTemplateDto, actorId?: string): Promise<EmailTemplate> {
    const t = await this.findOneEmailTemplate(id, companyId);
    const oldValue = { ...t } as unknown as Record<string, unknown>;
    Object.assign(t, dto);
    const saved = await this.emailTemplateRepository.save(t);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'email_templates',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeEmailTemplate(id: string, companyId: string, actorId?: string): Promise<void> {
    const t = await this.findOneEmailTemplate(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'email_templates',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: t.id, code: t.code } as Record<string, unknown>,
    });
    await this.emailTemplateRepository.softDelete(id);
  }

  // --- Document templates ---
  async createDocumentTemplate(companyId: string, dto: CreateDocumentTemplateDto, actorId?: string): Promise<DocumentTemplate> {
    const entity = this.documentTemplateRepository.create({ ...dto, companyId });
    const saved = await this.documentTemplateRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'document_templates',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findAllDocumentTemplates(companyId: string): Promise<DocumentTemplate[]> {
    return this.documentTemplateRepository.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async findOneDocumentTemplate(id: string, companyId: string): Promise<DocumentTemplate> {
    const t = await this.documentTemplateRepository.findOne({ where: { id, companyId } });
    if (!t) throw new NotFoundException(`Document template ${id} not found`);
    return t;
  }

  async updateDocumentTemplate(id: string, companyId: string, dto: UpdateDocumentTemplateDto, actorId?: string): Promise<DocumentTemplate> {
    const t = await this.findOneDocumentTemplate(id, companyId);
    const oldValue = { ...t } as unknown as Record<string, unknown>;
    Object.assign(t, dto);
    const saved = await this.documentTemplateRepository.save(t);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'document_templates',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async removeDocumentTemplate(id: string, companyId: string, actorId?: string): Promise<void> {
    const t = await this.findOneDocumentTemplate(id, companyId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'document_templates',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: t.id, code: t.code } as Record<string, unknown>,
    });
    await this.documentTemplateRepository.softDelete(id);
  }
}
