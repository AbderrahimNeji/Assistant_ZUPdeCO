import type {
  DocumentApiModel,
  DocumentItem,
  DocumentStatus,
  DocumentStatusFilter,
  DocumentSortKey,
} from "@/features/documents/types";

function mapStatus(raw: string | null | undefined): DocumentStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "PROCESSING":
      return "processing";
    case "FAILED":
      return "failed";
    case "INDEXED":
    case "READY":
      return "indexed";
    default:
      return "indexed";
  }
}

export function mapDocument(raw: DocumentApiModel): DocumentItem {
  return {
    id: raw.id,
    name: raw.name?.trim() || "Untitled document",
    mimeType: raw.mimeType ?? "application/octet-stream",
    size: typeof raw.size === "number" ? raw.size : 0,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt,
    status: mapStatus(raw.status),
    errorMessage: raw.errorMessage ?? null,
    pageCount: typeof raw.pageCount === "number" ? raw.pageCount : null,
    chunkCount:
      typeof raw._count?.chunks === "number" ? raw._count.chunks : undefined,
  };
}

export function mapDocuments(
  raw: DocumentApiModel[] | undefined,
): DocumentItem[] {
  if (!raw?.length) return [];
  return raw.map(mapDocument);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatUploadDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDocumentType(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "Word";
    case "application/msword":
      return "Word";
    case "text/plain":
      return "Text";
    case "text/markdown":
      return "Markdown";
    case "text/csv":
      return "CSV";
    default:
      return mimeType.split("/").pop()?.toUpperCase() || "File";
  }
}

export function statusLabel(status: DocumentStatus): string {
  switch (status) {
    case "uploading":
      return "Uploading";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "indexed":
    default:
      return "Indexed";
  }
}

const STATUS_SORT_ORDER: Record<DocumentStatus, number> = {
  failed: 0,
  processing: 1,
  uploading: 2,
  indexed: 3,
};

export function filterDocuments(
  documents: DocumentItem[],
  filter: DocumentStatusFilter,
): DocumentItem[] {
  if (filter === "all") return documents;
  return documents.filter((document) => document.status === filter);
}

export function sortDocuments(
  documents: DocumentItem[],
  sortKey: DocumentSortKey,
): DocumentItem[] {
  const next = [...documents];

  switch (sortKey) {
    case "name":
      return next.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    case "status":
      return next.sort((a, b) => {
        const byStatus =
          STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
        if (byStatus !== 0) return byStatus;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    case "date":
    default:
      return next.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}

export function searchDocuments(
  documents: DocumentItem[],
  query: string,
): DocumentItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return documents;
  return documents.filter((document) =>
    document.name.toLowerCase().includes(normalized),
  );
}
