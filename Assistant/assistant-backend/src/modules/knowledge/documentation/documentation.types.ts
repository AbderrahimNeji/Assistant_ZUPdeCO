/**
 * Shared types for the official ZupdeCo functional documentation RAG.
 */

export type DocumentationChunkDraft = {
  content: string;
  page: number;
  chapter: string;
  section: string;
  title: string;
  keywords: string[];
};

export type DocumentationHit = {
  id: string;
  content: string;
  score: number;
  semanticScore: number;
  keywordScore: number;
  page: number;
  chapter: string | null;
  section: string | null;
  title: string | null;
  keywords: string[];
  documentName: string;
  documentSlug: string | null;
  version?: string | null;
  contentHash?: string | null;
  ingestedAt?: string | null;
};

export type DocumentationCitation = {
  document: string;
  chapter?: string;
  section?: string;
  page: number;
  title?: string;
  version?: string;
  contentHash?: string;
  ingestedAt?: string;
};

export const FUNCTIONAL_DOC_SLUG = 'zupdeco-functional';
export const FUNCTIONAL_DOC_NAME = 'Documentation Fonctionnelle ZupdeCo';
export const DOCUMENTATION_SYSTEM_EMAIL = 'documentation-system@zupdeco.local';
