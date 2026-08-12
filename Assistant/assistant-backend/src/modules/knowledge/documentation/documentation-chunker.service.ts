import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

import {
  cleanDocumentationText,
  extractKeywords,
} from './documentation-text.util';
import type { DocumentationChunkDraft } from './documentation.types';

const CHAPTER_RE = /^VF-[\d.]+[^\n]*$/i;
const SECTION_RE = /^(\d+(?:\.\d+)*)\.\s+(.+)$/;
const STEP_RE = /^Étape\s+\d+\s*[—–-]\s*(.+)$/i;

type PageBlock = {
  page: number;
  text: string;
};

/**
 * Hierarchy-aware semantic chunker for ZupdeCo functional PDFs.
 * Preserves chapter (VF-x.y), section numbers, and step titles in metadata.
 */
@Injectable()
export class DocumentationChunkerService {
  async chunkPages(pages: PageBlock[]): Promise<DocumentationChunkDraft[]> {
    const drafts: DocumentationChunkDraft[] = [];
    let chapter = 'Documentation';
    let section = '';
    let title = chapter;

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 900,
      chunkOverlap: 150,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    for (const pageBlock of pages) {
      const cleaned = cleanDocumentationText(pageBlock.text);
      if (!cleaned) continue;

      const lines = cleaned.split('\n').map((l) => l.trim());
      let buffer: string[] = [];
      let bufferSection = section;
      let bufferTitle = title;

      const flush = async () => {
        const body = buffer.join('\n').trim();
        buffer = [];
        if (!body) return;

        const docs = await splitter.createDocuments([body]);
        for (const doc of docs) {
          const content = doc.pageContent.trim();
          if (!content) continue;
          drafts.push({
            content,
            page: pageBlock.page,
            chapter,
            section: bufferSection || chapter,
            title: bufferTitle || bufferSection || chapter,
            keywords: extractKeywords(
              chapter,
              bufferSection,
              bufferTitle,
              content.slice(0, 280),
            ),
          });
        }
      };

      for (const line of lines) {
        if (!line) {
          buffer.push('');
          continue;
        }

        if (CHAPTER_RE.test(line)) {
          await flush();
          chapter = line.replace(/\s+/g, ' ').trim();
          section = '';
          title = chapter;
          bufferSection = section;
          bufferTitle = title;
          buffer.push(line);
          continue;
        }

        const sectionMatch = SECTION_RE.exec(line);
        if (sectionMatch && sectionMatch[1].split('.').length <= 3) {
          await flush();
          section = `${sectionMatch[1]}. ${sectionMatch[2]}`.trim();
          title = section;
          bufferSection = section;
          bufferTitle = title;
          buffer.push(line);
          continue;
        }

        const stepMatch = STEP_RE.exec(line);
        if (stepMatch) {
          await flush();
          title = line;
          bufferTitle = title;
          buffer.push(line);
          continue;
        }

        buffer.push(line);
      }

      await flush();
    }

    return this.mergeTinyChunks(drafts);
  }

  private mergeTinyChunks(
    drafts: DocumentationChunkDraft[],
  ): DocumentationChunkDraft[] {
    if (drafts.length < 2) return drafts;

    const merged: DocumentationChunkDraft[] = [];
    for (const draft of drafts) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        prev.page === draft.page &&
        prev.chapter === draft.chapter &&
        prev.section === draft.section &&
        prev.content.length < 220
      ) {
        prev.content = `${prev.content}\n\n${draft.content}`.trim();
        prev.keywords = [
          ...new Set([...prev.keywords, ...draft.keywords]),
        ].slice(0, 24);
        continue;
      }
      merged.push({ ...draft });
    }
    return merged;
  }
}
