import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity';
import { Branding } from './entities/branding.entity';
import { BrandingHistory } from './entities/branding-history.entity';
import { Theme } from './entities/theme.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { DocumentTemplate } from './entities/document-template.entity';
import { UiConfiguration } from './entities/ui-configuration.entity';
import { BrandingService } from './branding.service';
import { BrandingController } from './branding.controller';
import { PublicBrandingController } from './public-branding.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      Branding,
      BrandingHistory,
      Theme,
      MediaAsset,
      EmailTemplate,
      DocumentTemplate,
      UiConfiguration,
    ]),
    AuditModule,
  ],
  controllers: [BrandingController, PublicBrandingController],
  providers: [BrandingService],
  exports: [TypeOrmModule, BrandingService],
})
export class BrandingModule {}
