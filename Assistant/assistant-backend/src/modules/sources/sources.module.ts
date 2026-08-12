import { Module } from '@nestjs/common';
import { SourcesService } from './sources.service';

@Module({
  providers: [SourcesService]
})
export class SourcesModule {}
