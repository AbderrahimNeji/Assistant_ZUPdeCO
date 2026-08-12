"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  FileText,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  RefreshCw,
  SendHorizontal,
  Square,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MessageComposerHandle = {
  focus: () => void;
};

export type ComposerAttachment = {
  id: string;
  name: string;
  size: number;
  status: "parsing" | "ready" | "error";
  progress: number;
  text?: string;
  error?: string;
  /** True when already stored on the conversation (not pending upload). */
  persisted?: boolean;
};

type MessageComposerProps = {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  onRetry?: () => void;
  placeholder?: string;
  /** Disables the textarea and action buttons. */
  disabled?: boolean;
  /** Keeps the textarea usable while send stays unavailable. */
  actionsDisabled?: boolean;
  isSending?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  error?: string | null;
  maxLength?: number;
  className?: string;
  attachments?: ComposerAttachment[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  speechSupported?: boolean;
  isListening?: boolean;
  speechError?: string | null;
  onToggleSpeech?: () => void;
  /** When true, matched workflows run asynchronously. */
  runInBackground?: boolean;
  onRunInBackgroundChange?: (value: boolean) => void;
};

const MIN_HEIGHT_PX = 44;
const MAX_HEIGHT_PX = 180;
const DEFAULT_MAX_LENGTH = 4000;
const ACCEPT =
  ".pdf,.docx,.txt,.md,.markdown,.csv,application/pdf,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const MessageComposer = forwardRef<
  MessageComposerHandle,
  MessageComposerProps
>(function MessageComposer(
  {
    value = "",
    onChange,
    onSubmit,
    onRetry,
    placeholder = "Ask about documents, tutoring, or programs…",
    disabled = false,
    actionsDisabled = false,
    isSending = false,
    isStreaming = false,
    onStop,
    error = null,
    maxLength = DEFAULT_MAX_LENGTH,
    className,
    attachments = [],
    onAttachFiles,
    onRemoveAttachment,
    speechSupported = false,
    isListening = false,
    speechError = null,
    onToggleSpeech,
    runInBackground = false,
    onRunInBackgroundChange,
  },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const actionsLocked = disabled || actionsDisabled || isSending;
  const inputLocked = disabled || isSending;
  const characterCount = value.length;
  const showCounter =
    characterCount >= Math.min(200, Math.floor(maxLength * 0.05));
  const hasPendingReadyAttachments = attachments.some(
    (attachment) =>
      !attachment.persisted &&
      attachment.status === "ready" &&
      Boolean(attachment.text),
  );
  const hasParsingAttachments = attachments.some(
    (attachment) => attachment.status === "parsing",
  );
  const canSubmit =
    !actionsLocked &&
    !hasParsingAttachments &&
    (value.trim().length > 0 || hasPendingReadyAttachments);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(
      Math.max(el.scrollHeight, MIN_HEIGHT_PX),
      MAX_HEIGHT_PX,
    );
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (isStreaming) return;
      if (canSubmit) onSubmit?.();
    }
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length || !onAttachFiles) return;
    onAttachFiles(Array.from(fileList));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    handleFilesSelected(event.dataTransfer.files);
  }

  return (
    <div
      data-composer-dropzone
      className={cn(
        "shrink-0 border-t border-border bg-card/95 px-4 py-3.5 backdrop-blur-[2px] md:px-8 md:py-4",
        className,
      )}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <form
        className="mx-auto w-full max-w-4xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (isStreaming) return;
          if (canSubmit) onSubmit?.();
        }}
        aria-label="Message composer"
      >
        {isListening ? (
          <div
            role="status"
            className="mb-2.5 flex items-center gap-2 rounded-xl border border-brand-orange/35 bg-brand-peach px-3 py-2 text-xs font-medium text-brand-orange"
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-orange/60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-brand-orange" />
            </span>
            Listening… speak now. Click the microphone to stop.
          </div>
        ) : null}

        {speechError ? (
          <p role="alert" className="mb-2 text-xs text-destructive">
            {speechError}
          </p>
        ) : null}

        {attachments.length > 0 ? (
          <ul
            className="mb-2.5 flex flex-wrap gap-2"
            aria-label="Attached files"
          >
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className={cn(
                  "flex max-w-full items-center gap-2 rounded-xl border bg-background px-2.5 py-1.5 text-xs shadow-sm",
                  attachment.status === "error"
                    ? "border-destructive/30 text-destructive"
                    : "border-border text-foreground",
                )}
              >
                <FileText
                  className="size-3.5 shrink-0 text-brand-orange"
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {attachment.name}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {attachment.status === "parsing"
                      ? `Reading… ${attachment.progress}%`
                      : attachment.status === "error"
                        ? attachment.error || "Failed"
                        : attachment.persisted
                          ? `${formatBytes(attachment.size)} · in this chat`
                          : formatBytes(attachment.size)}
                  </span>
                </span>
                {attachment.status === "parsing" ? (
                  <Loader2
                    className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                ) : (
                  <button
                    type="button"
                    className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${attachment.name}`}
                    onClick={() => onRemoveAttachment?.(attachment.id)}
                    disabled={isSending}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        <div
          className={cn(
            "flex items-end gap-1.5 rounded-[1.5rem] border border-border bg-background p-1.5 pl-2 shadow-card ednov-transition",
            "focus-within:border-brand-orange/70 focus-within:shadow-bubble focus-within:ring-3 focus-within:ring-brand-orange/15",
            isDragging && "border-brand-orange bg-brand-peach/40",
            inputLocked && "bg-muted/35",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept={ACCEPT}
            multiple
            onChange={(event) => handleFilesSelected(event.target.files)}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mb-0.5 size-9 shrink-0 rounded-full text-muted-foreground hover:bg-brand-peach hover:text-brand-orange"
            disabled={inputLocked || !onAttachFiles}
            aria-label="Attach files"
            title="Attach PDF, DOCX, TXT, Markdown, or CSV"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "mb-0.5 size-9 shrink-0 rounded-full",
              isListening
                ? "bg-brand-peach text-brand-orange"
                : "text-muted-foreground hover:bg-brand-peach hover:text-brand-orange",
              !speechSupported && "opacity-40",
            )}
            disabled={inputLocked || !speechSupported}
            aria-label={
              !speechSupported
                ? "Voice input unavailable"
                : isListening
                  ? "Stop recording"
                  : "Start voice input"
            }
            title={
              speechSupported
                ? isListening
                  ? "Stop recording"
                  : "Voice input"
                : "Voice input is not supported in this browser"
            }
            onClick={onToggleSpeech}
          >
            {isListening ? (
              <MicOff className="size-4" aria-hidden />
            ) : (
              <Mic className="size-4" aria-hidden />
            )}
          </Button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              const next = event.target.value.slice(0, maxLength);
              onChange?.(next);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isDragging
                ? "Drop files to attach…"
                : placeholder
            }
            disabled={inputLocked}
            rows={1}
            maxLength={maxLength}
            aria-label="Message input"
            aria-disabled={inputLocked || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [error ? "composer-error" : null, "composer-hint"]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={cn(
              "max-h-[11.25rem] min-h-11 flex-1 resize-none bg-transparent py-2.5 pr-1 text-[0.9375rem] leading-relaxed text-foreground outline-none",
              "placeholder:text-muted-foreground/85",
              "disabled:cursor-not-allowed disabled:text-muted-foreground",
            )}
          />

          {isStreaming ? (
            <Button
              type="button"
              variant="brand"
              size="icon"
              className={cn(
                "mb-0.5 size-10 shrink-0 self-end rounded-full shadow-sm duration-150",
                "focus-visible:ring-brand-orange/40 active:scale-[0.96]",
              )}
              onClick={() => onStop?.()}
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square className="size-3.5 fill-current" aria-hidden />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="brand"
              size="icon"
              className={cn(
                "mb-0.5 size-10 shrink-0 self-end rounded-full shadow-sm duration-150",
                "focus-visible:ring-brand-orange/40 active:scale-[0.96]",
                !canSubmit && "opacity-55",
              )}
              disabled={!canSubmit}
              aria-label={isSending ? "Sending message" : "Send message"}
              aria-busy={isSending}
              title={isSending ? "Sending…" : "Send message"}
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <SendHorizontal className="size-4" aria-hidden />
              )}
            </Button>
          )}
        </div>

        {error ? (
          <div
            id="composer-error"
            role="alert"
            className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs text-destructive"
          >
            <span>{error}</span>
            {onRetry ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={onRetry}
                disabled={isSending}
                aria-label="Retry sending message"
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Retry
              </Button>
            ) : null}
          </div>
        ) : (
          <div
            id="composer-hint"
            className="mt-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground md:text-xs"
          >
            <p className="min-w-0 flex-1 text-center sm:text-left">
              Attach files or use voice · Enter to send · Shift + Enter for a new
              line
            </p>
            {onRunInBackgroundChange ? (
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px]">
                <input
                  type="checkbox"
                  className="size-3.5 rounded border-border accent-brand-orange"
                  checked={runInBackground}
                  disabled={actionsLocked}
                  onChange={(event) =>
                    onRunInBackgroundChange(event.target.checked)
                  }
                />
                <span>Background</span>
              </label>
            ) : null}
            {showCounter ? (
              <p
                className={cn(
                  "shrink-0 tabular-nums",
                  characterCount >= maxLength && "text-destructive",
                )}
                aria-live="polite"
              >
                {characterCount}/{maxLength}
              </p>
            ) : (
              <span className="hidden w-16 sm:block" aria-hidden />
            )}
          </div>
        )}
      </form>
    </div>
  );
});
