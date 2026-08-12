"use client";

import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentCard } from "@/features/documents/components/document-card";
import {
  DocumentUploadZone,
  type UploadQueueItem,
} from "@/features/documents/components/document-upload-zone";
import { useDeleteDocument } from "@/features/documents/hooks/use-delete-document";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { useRetryDocument } from "@/features/documents/hooks/use-retry-document";
import { useUploadDocument } from "@/features/documents/hooks/use-upload-document";
import type {
  DocumentItem,
  DocumentSortKey,
  DocumentStatusFilter,
} from "@/features/documents/types";
import {
  filterDocuments,
  searchDocuments,
  sortDocuments,
} from "@/features/documents/utils/map-document";
import { ConfirmDialog, PageContainer } from "@/features/shared/components";
import { toast } from "@/features/shared/store/toast.store";
import { cn } from "@/lib/utils";

const UPLOAD_CONCURRENCY = 3;

const STATUS_FILTERS: Array<{ value: DocumentStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "indexed", label: "Indexed" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
];

function DocumentsSkeleton() {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      role="status"
      aria-label="Loading documents"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-44 animate-pulse rounded-2xl bg-muted"
        />
      ))}
      <span className="sr-only">Loading documents…</span>
    </div>
  );
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(queue.length, 1)) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) return;
        await worker(item);
      }
    },
  );
  await Promise.all(workers);
}

export function DocumentsView() {
  const documentsQuery = useDocuments();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const retryDocument = useRetryDocument();

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [, startFilterTransition] = useTransition();
  const [statusFilter, setStatusFilter] =
    useState<DocumentStatusFilter>("all");
  const [sortKey, setSortKey] = useState<DocumentSortKey>("date");
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const pendingNamesRef = useRef<Set<string>>(new Set());

  const documents = useMemo(
    () => documentsQuery.data ?? [],
    [documentsQuery.data],
  );

  const isUploading = uploadQueue.some(
    (item) =>
      item.status === "queued" ||
      item.status === "uploading" ||
      item.status === "processing",
  );

  const processingCount = documents.filter(
    (document) => document.status === "processing",
  ).length;

  const visibleDocuments = useMemo(() => {
    const filtered = filterDocuments(documents, statusFilter);
    const searched = searchDocuments(filtered, deferredSearch);
    return sortDocuments(searched, sortKey);
  }, [documents, statusFilter, deferredSearch, sortKey]);

  const filterCounts = useMemo(() => {
    return {
      all: documents.length,
      indexed: documents.filter((document) => document.status === "indexed")
        .length,
      processing: documents.filter(
        (document) => document.status === "processing",
      ).length,
      failed: documents.filter((document) => document.status === "failed")
        .length,
    } satisfies Record<DocumentStatusFilter, number>;
  }, [documents]);

  function updateQueueItem(id: string, patch: Partial<UploadQueueItem>) {
    setUploadQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function processUploads(files: File[]) {
    const existingNames = new Set(
      documents.map((document) => document.name.toLowerCase()),
    );

    const accepted: File[] = [];
    for (const file of files) {
      const key = file.name.toLowerCase();
      if (pendingNamesRef.current.has(key)) {
        toast({
          title: "Upload skipped",
          description: `“${file.name}” is already uploading.`,
          variant: "error",
        });
        continue;
      }
      if (existingNames.has(key)) {
        toast({
          title: "Upload skipped",
          description: `“${file.name}” is already in your library.`,
          variant: "error",
        });
        continue;
      }
      pendingNamesRef.current.add(key);
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    const queueItems: UploadQueueItem[] = accepted.map((file) => ({
      id: `upload-${crypto.randomUUID()}`,
      name: file.name,
      progress: 0,
      status: "queued",
    }));

    setUploadQueue((current) => [...queueItems, ...current].slice(0, 12));

    const jobs = accepted.map((file, index) => ({
      file,
      queueItem: queueItems[index],
    }));

    await runWithConcurrency(jobs, UPLOAD_CONCURRENCY, async ({ file, queueItem }) => {
      updateQueueItem(queueItem.id, { status: "uploading", progress: 0 });

      try {
        await uploadDocument.mutateAsync({
          file,
          onProgress: (progress) => {
            updateQueueItem(queueItem.id, { progress });
          },
        });

        updateQueueItem(queueItem.id, {
          status: "processing",
          progress: 100,
        });

        toast({
          title: "Upload received",
          description: `“${file.name}” is processing and will appear as Indexed when ready.`,
          variant: "success",
        });

        window.setTimeout(() => {
          setUploadQueue((current) =>
            current.filter((item) => item.id !== queueItem.id),
          );
        }, 2500);
      } catch (error) {
        const message = getDocumentsErrorMessage(error);
        updateQueueItem(queueItem.id, {
          status: "error",
          error: message,
        });
        toast({
          title: "Upload failed",
          description: `“${file.name}”: ${message}`,
          variant: "error",
        });
      } finally {
        pendingNamesRef.current.delete(file.name.toLowerCase());
      }
    });
  }

  function handleDeleteConfirm() {
    if (!pendingDelete) return;

    deleteDocument.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast({
          title: "Document deleted",
          description: `“${pendingDelete.name}” was removed.`,
          variant: "success",
        });
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(pendingDelete.id);
          return next;
        });
        setPendingDelete(null);
      },
      onError: (error) => {
        toast({
          title: "Delete failed",
          description: getDocumentsErrorMessage(error),
          variant: "error",
        });
      },
    });
  }

  function handleBulkDeleteConfirm() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    deleteDocument.mutate(ids, {
      onSuccess: () => {
        toast({
          title: "Documents deleted",
          description: `${ids.length} document${ids.length === 1 ? "" : "s"} removed.`,
          variant: "success",
        });
        setSelectedIds(new Set());
        setSelectionMode(false);
        setPendingBulkDelete(false);
      },
      onError: (error) => {
        toast({
          title: "Bulk delete failed",
          description: getDocumentsErrorMessage(error),
          variant: "error",
        });
      },
    });
  }

  function handleRetry(document: DocumentItem) {
    retryDocument.mutate(document.id, {
      onSuccess: () => {
        toast({
          title: "Retry started",
          description: `“${document.name}” is processing again.`,
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: "Retry failed",
          description: getDocumentsErrorMessage(error),
          variant: "error",
        });
      },
    });
  }

  function toggleSelect(document: DocumentItem) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(document.id)) next.delete(document.id);
      else next.add(document.id);
      return next;
    });
  }

  function cancelSelection() {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }

  const hasActiveFilters =
    statusFilter !== "all" || deferredSearch.trim().length > 0;

  return (
    <PageContainer
      title="Documents"
      description="Upload and manage knowledge-base documents for RAG retrieval."
    >
      <div className="space-y-6">
        <DocumentUploadZone
          isBusy={isUploading}
          queue={uploadQueue.slice(0, 8)}
          onFilesSelected={(files) => {
            void processUploads(files);
          }}
        />

        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold tracking-tight">
                Your library
              </h2>
              <p className="text-xs text-muted-foreground">
                {documents.length} document{documents.length === 1 ? "" : "s"}
                {processingCount > 0
                  ? ` · ${processingCount} processing`
                  : ""}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:w-64">
                <span className="sr-only">Search documents</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by file name…"
                  className="h-10 rounded-xl pl-10"
                />
              </label>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="sr-only">Sort documents</span>
                <select
                  value={sortKey}
                  onChange={(event) =>
                    setSortKey(event.target.value as DocumentSortKey)
                  }
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-label="Sort documents"
                >
                  <option value="date">Upload date</option>
                  <option value="name">File name</option>
                  <option value="status">Status</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === filter.value}
                  onClick={() => {
                    startFilterTransition(() => {
                      setStatusFilter(filter.value);
                    });
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold ednov-transition",
                    statusFilter === filter.value
                      ? "bg-brand-navy text-white"
                      : "border border-brand-orange/35 bg-card text-brand-orange hover:bg-brand-peach",
                  )}
                >
                  {filter.label}
                  <span className="ml-1.5 tabular-nums opacity-70">
                    {filterCounts[filter.value]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectionMode ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {selectedIds.size} selected
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={selectedIds.size === 0 || deleteDocument.isPending}
                    onClick={() => setPendingBulkDelete(true)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Delete selected
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelSelection}
                    disabled={deleteDocument.isPending}
                  >
                    <X className="size-3.5" aria-hidden />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  disabled={documents.length === 0}
                >
                  Select
                </Button>
              )}
            </div>
          </div>

          {documentsQuery.isLoading ? <DocumentsSkeleton /> : null}

          {documentsQuery.isError ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-10 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle className="size-5" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm font-semibold">
                  Couldn’t load documents
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your connection and try again.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void documentsQuery.refetch()}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Retry
              </Button>
            </div>
          ) : null}

          {!documentsQuery.isLoading &&
          !documentsQuery.isError &&
          visibleDocuments.length === 0 ? (
            <div
              role="status"
              className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center"
            >
              <div className="flex size-14 items-center justify-center rounded-xl bg-brand-peach text-brand-orange">
                <FileText className="size-6" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <p className="font-display text-sm font-semibold">
                  {hasActiveFilters
                    ? "No matching documents"
                    : "No documents yet"}
                </p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {hasActiveFilters
                    ? "Try another filter or search term."
                    : "Upload PDFs, Word, or text files to build your knowledge base."}
                </p>
              </div>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : null}

          {!documentsQuery.isLoading &&
          !documentsQuery.isError &&
          visibleDocuments.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibleDocuments.map((document) => (
                <li key={document.id}>
                  <DocumentCard
                    document={document}
                    searchQuery={deferredSearch}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(document.id)}
                    onToggleSelect={toggleSelect}
                    onDelete={setPendingDelete}
                    onRetry={handleRetry}
                    isDeleting={
                      deleteDocument.isPending &&
                      (deleteDocument.variables === document.id ||
                        (Array.isArray(deleteDocument.variables) &&
                          deleteDocument.variables.includes(document.id)))
                    }
                    isRetrying={
                      retryDocument.isPending &&
                      retryDocument.variables === document.id
                    }
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete document?"
        description={
          pendingDelete?.name
            ? `“${pendingDelete.name}” will be permanently removed from your knowledge base.`
            : "This document will be permanently removed from your knowledge base."
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting…"
        isConfirming={
          deleteDocument.isPending && !Array.isArray(deleteDocument.variables)
        }
        onCancel={() => {
          if (!deleteDocument.isPending) setPendingDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={pendingBulkDelete}
        title="Delete selected documents?"
        description={`${selectedIds.size} document${selectedIds.size === 1 ? "" : "s"} will be permanently removed from your knowledge base.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting…"
        isConfirming={
          deleteDocument.isPending && Array.isArray(deleteDocument.variables)
        }
        onCancel={() => {
          if (!deleteDocument.isPending) setPendingBulkDelete(false);
        }}
        onConfirm={handleBulkDeleteConfirm}
      />
    </PageContainer>
  );
}

function getDocumentsErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length > 0) {
      return message.filter(Boolean).join(". ");
    }
    if (!error.response) {
      return "Unable to reach the server.";
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}
