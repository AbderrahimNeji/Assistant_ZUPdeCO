import { Injectable, NotFoundException } from '@nestjs/common';

import { EdnovApiClient } from '../ednov-api.client';
import { encodeEdnovId } from '../ednov-path';
import { RequestContextStore } from '../request-context';

type EdnovResource = {
  id: string;
  title?: string;
  name?: string;
  description?: string | null;
  type?: string;
  url?: string | null;
};

type Paginated<T> = {
  data?: T[];
  items?: T[];
  results?: T[];
};

@Injectable()
export class ResourceAdapter {
  constructor(private readonly ednov: EdnovApiClient) {}

  async list(limit = 12): Promise<
    Array<{ id: string; title: string; description: string; type: string | null }>
  > {
    const focused = RequestContextStore.getApplicationContext()?.document?.id;
    if (focused) {
      const one = await this.getById(focused);
      return [one];
    }

    const page = await this.ednov.get<Paginated<EdnovResource> | EdnovResource[]>(
      '/resources',
      { params: { page: 1, pageSize: limit } },
    );
    return this.unwrap(page)
      .slice(0, limit)
      .map((row) => this.map(row));
  }

  async getById(id: string) {
    try {
      const row = await this.ednov.get<EdnovResource>(
        `/resources/${encodeEdnovId(id)}`,
      );
      return this.map(row);
    } catch {
      throw new NotFoundException('Resource not found');
    }
  }

  private map(row: EdnovResource) {
    return {
      id: row.id,
      title: row.title || row.name || 'Resource',
      description: row.description?.trim() || '',
      type: row.type ?? null,
    };
  }

  private unwrap(page: Paginated<EdnovResource> | EdnovResource[]): EdnovResource[] {
    if (Array.isArray(page)) return page;
    return page.data ?? page.items ?? page.results ?? [];
  }
}
