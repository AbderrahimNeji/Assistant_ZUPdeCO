import { Injectable, OnModuleInit } from '@nestjs/common';
import { pipeline } from '@xenova/transformers';

import { ErrorLogger } from '../../../common/logger/error-logger';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private extractor: any;

  async onModuleInit() {
    try {
      console.log('📦 Loading embedding model...');

      this.extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      );

      console.log('✅ Embedding model loaded');
    } catch (error) {
      ErrorLogger.log(error, 'EmbeddingService.onModuleInit');
      throw error;
    }
  }

  async embed(text: string): Promise<number[]> {
    const start = performance.now();

    try {
      const output = await this.extractor(text, {
        pooling: 'mean',
        normalize: true,
      });

      ErrorLogger.logDuration(
        'EmbeddingService.embed',
        performance.now() - start,
      );

      return Array.from(output.data);
    } catch (error) {
      ErrorLogger.log(error, 'EmbeddingService.embed', {
        textLength: text?.length,
      });
      throw error;
    }
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const start = performance.now();

    try {
      const vectors: number[][] = [];

      for (const text of texts) {
        vectors.push(await this.embed(text));
      }

      ErrorLogger.logDuration(
        'EmbeddingService.embedDocuments',
        performance.now() - start,
        { documentCount: texts.length },
      );

      return vectors;
    } catch (error) {
      ErrorLogger.log(error, 'EmbeddingService.embedDocuments', {
        documentCount: texts?.length,
      });
      throw error;
    }
  }
}
