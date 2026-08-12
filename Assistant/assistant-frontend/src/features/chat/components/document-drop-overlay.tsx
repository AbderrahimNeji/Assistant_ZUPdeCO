"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";

import { useUploadDocument } from "@/features/documents/hooks/use-upload-document";
import { toast } from "@/features/shared/store/toast.store";
import { cn } from "@/lib/utils";

type DocumentDropOverlayProps = {
  className?: string;
};

function isFileDrag(event: DragEvent | globalThis.DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function isComposerDropTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("[data-composer-dropzone]"))
  );
}

/**
 * Page-level document drop target for the Assistant shell.
 * Reuses the documents upload mutation; does not wire the composer attach button.
 */
export function DocumentDropOverlay({ className }: DocumentDropOverlayProps) {
  const { mutateAsync } = useUploadDocument();
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const uploadingRef = useRef(false);

  const resetDrag = useCallback(() => {
    dragDepthRef.current = 0;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    function onDragEnter(event: globalThis.DragEvent) {
      if (!isFileDrag(event) || isComposerDropTarget(event.target)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    }

    function onDragLeave(event: globalThis.DragEvent) {
      if (!isFileDrag(event) || isComposerDropTarget(event.target)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragging(false);
    }

    function onDragOver(event: globalThis.DragEvent) {
      if (!isFileDrag(event) || isComposerDropTarget(event.target)) return;
      event.preventDefault();
      event.dataTransfer!.dropEffect = "copy";
    }

    async function onDrop(event: globalThis.DragEvent) {
      if (!isFileDrag(event) || isComposerDropTarget(event.target)) return;
      event.preventDefault();
      resetDrag();

      const files = Array.from(event.dataTransfer?.files ?? []);
      if (!files.length || uploadingRef.current) return;

      uploadingRef.current = true;
      try {
        for (const file of files) {
          try {
            await mutateAsync({ file });
            toast({
              title: "Upload received",
              description: `“${file.name}” is processing in your knowledge base.`,
              variant: "success",
            });
          } catch {
            toast({
              title: "Upload failed",
              description: `Couldn’t upload “${file.name}”. Try again from Documents.`,
              variant: "error",
            });
          }
        }
      } finally {
        uploadingRef.current = false;
      }
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [mutateAsync, resetDrag]);

  if (!isDragging) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-brand-navy/55 p-6 backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-dashed border-white/50 bg-brand-navy-deep/90 px-8 py-10 text-center text-white shadow-card">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-orange/20 text-brand-orange">
          <UploadCloud className="size-7" aria-hidden />
        </div>
        <p className="font-display text-lg font-bold tracking-tight">
          Drop to upload documents
        </p>
        <p className="text-sm text-white/70">
          Files are added to your knowledge base using the same upload flow as
          the Documents page.
        </p>
      </div>
    </div>
  );
}
