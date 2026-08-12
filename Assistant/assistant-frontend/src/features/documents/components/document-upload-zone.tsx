"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadQueueItem = {
  id: string;
  name: string;
  progress: number;
  status: "queued" | "uploading" | "processing" | "success" | "error";
  error?: string;
};

type DocumentUploadZoneProps = {
  onFilesSelected: (files: File[]) => void;
  /** When true, the dropzone still accepts files but shows a busy cue. */
  isBusy?: boolean;
  queue?: UploadQueueItem[];
  className?: string;
  accept?: string;
};

export function DocumentUploadZone({
  onFilesSelected,
  isBusy = false,
  queue = [],
  className,
  accept = ".pdf,.txt,.md,.docx",
}: DocumentUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    onFilesSelected(Array.from(fileList));
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center ednov-transition",
          isDragging
            ? "border-brand-orange bg-brand-peach"
            : "border-border bg-card hover:border-brand-orange/55 hover:bg-brand-peach/40",
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand-peach text-brand-orange">
          {isBusy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <UploadCloud className="size-5 stroke-[1.75]" aria-hidden />
          )}
        </div>
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold text-foreground">
            Drag & drop files here
          </p>
          <p className="text-xs text-muted-foreground">
            Select or drop multiple PDFs, Word, or text files. Uploads run in
            parallel.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          aria-label="Choose files to upload"
        >
          <FileUp className="size-3.5" aria-hidden />
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept={accept}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {queue.length > 0 ? (
        <ul className="space-y-2" aria-label="Upload progress" aria-live="polite">
          {queue.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border/70 bg-card px-3 py-2.5"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.status === "queued"
                    ? "Queued"
                    : item.status === "uploading"
                      ? `Uploading ${item.progress}%`
                      : item.status === "processing"
                        ? "Processing…"
                        : item.status === "success"
                          ? "Uploaded"
                          : "Failed"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-200",
                    item.status === "error"
                      ? "bg-destructive"
                      : item.status === "processing"
                        ? "bg-brand-navy/70"
                        : "bg-brand-orange",
                  )}
                  style={{
                    width: `${
                      item.status === "success" || item.status === "processing"
                        ? 100
                        : item.progress
                    }%`,
                  }}
                />
              </div>
              {item.error ? (
                <p className="mt-1.5 text-xs text-destructive">{item.error}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
