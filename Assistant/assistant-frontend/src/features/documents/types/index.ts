export type DocumentStatus =
  | "uploading"
  | "processing"
  | "indexed"
  | "failed";

export type DocumentItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt?: string;
  status: DocumentStatus;
  errorMessage?: string | null;
  pageCount?: number | null;
  chunkCount?: number;
};

export type DocumentUploadResponse = {
  success: boolean;
  documentId: string;
  status?: string;
  pageCount?: number | null;
  chunks: number;
  embeddings: number;
  dimension: number;
};

export type DocumentApiModel = {
  id: string;
  name?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  status?: string | null;
  errorMessage?: string | null;
  pageCount?: number | null;
  _count?: {
    chunks?: number;
  };
};

export type DocumentStatusFilter = "all" | "indexed" | "processing" | "failed";

export type DocumentSortKey = "date" | "name" | "status";
