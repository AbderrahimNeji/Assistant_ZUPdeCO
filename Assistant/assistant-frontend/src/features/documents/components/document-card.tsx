"use client";

import {
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HighlightedText } from "@/features/documents/components/highlighted-text";
import type { DocumentItem } from "@/features/documents/types";
import {
  formatDocumentType,
  formatFileSize,
  formatUploadDate,
  statusLabel,
} from "@/features/documents/utils/map-document";
import { cn } from "@/lib/utils";

type DocumentCardProps = {
  document: DocumentItem;
  selected?: boolean;
  selectionMode?: boolean;
  searchQuery?: string;
  onToggleSelect?: (document: DocumentItem) => void;
  onDelete?: (document: DocumentItem) => void;
  onRetry?: (document: DocumentItem) => void;
  isDeleting?: boolean;
  isRetrying?: boolean;
  className?: string;
};

function statusVariant(
  status: DocumentItem["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "processing":
    case "uploading":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

export function DocumentCard({
  document,
  selected = false,
  selectionMode = false,
  searchQuery = "",
  onToggleSelect,
  onDelete,
  onRetry,
  isDeleting = false,
  isRetrying = false,
  className,
}: DocumentCardProps) {
  const typeLabel = formatDocumentType(document.mimeType);
  const canRetry = document.status === "failed";
  const isIndexed = document.status === "indexed";

  return (
    <Card
      className={cn(
        "shadow-sm transition-[box-shadow,border-color] duration-200",
        selected && "ring-2 ring-brand-orange/50",
        className,
      )}
    >
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {selectionMode ? (
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 rounded border-border accent-brand-orange"
              checked={selected}
              onChange={() => onToggleSelect?.(document)}
              aria-label={`Select ${document.name}`}
            />
          ) : null}

          <div className="min-w-0 space-y-1.5">
            <CardTitle
              className="truncate text-base"
              title={document.name}
            >
              <HighlightedText text={document.name} query={searchQuery} />
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{formatFileSize(document.size)}</span>
              <span aria-hidden>·</span>
              <span>{typeLabel}</span>
              {typeof document.pageCount === "number" ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {document.pageCount}{" "}
                    {document.pageCount === 1 ? "page" : "pages"}
                  </span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <time dateTime={document.createdAt}>
                {formatUploadDate(document.createdAt)}
              </time>
            </CardDescription>
          </div>
        </div>

        <Badge
          variant={statusVariant(document.status)}
          className={cn(
            "shrink-0",
            isIndexed &&
              "border-brand-mint/80 bg-brand-mint/40 text-brand-navy",
          )}
        >
          {document.status === "processing" ||
          document.status === "uploading" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : isIndexed ? (
            <CheckCircle2 className="size-3" aria-hidden />
          ) : null}
          {statusLabel(document.status)}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3.5" aria-hidden />
            {typeLabel}
          </span>
          {typeof document.chunkCount === "number" ? (
            <span>
              {document.chunkCount}{" "}
              {document.chunkCount === 1 ? "chunk" : "chunks"}
            </span>
          ) : null}
          {isIndexed ? (
            <span className="font-medium text-brand-navy/80">
              Indexed for retrieval
            </span>
          ) : null}
        </div>

        {document.status === "processing" ? (
          <p className="text-xs text-muted-foreground">
            Extracting chunks and embeddings. This list refreshes automatically.
          </p>
        ) : null}

        {document.status === "failed" ? (
          <p className="text-xs text-destructive" role="alert">
            {document.errorMessage?.trim() ||
              "Indexing failed. You can retry if extracted text was retained."}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRetry?.(document)}
              disabled={isRetrying || isDeleting}
              aria-busy={isRetrying}
              aria-label={`Retry indexing ${document.name}`}
            >
              {isRetrying ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
              Retry
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete?.(document)}
            disabled={isDeleting || isRetrying}
            aria-label={`Delete ${document.name}`}
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
