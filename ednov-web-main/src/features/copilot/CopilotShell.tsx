import * as React from 'react';
import {
  Bot,
  Check,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  File,
  FileImage,
  FileText,
  Loader2,
  Maximize2,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  MoreVertical,
  Paperclip,
  Pencil,
  Pin,
  SendHorizontal,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { AnswerMeta } from './AnswerMeta';
import { AssistantMarkdown } from './AssistantMarkdown';
import { deriveAnswerMode } from './answerMode';
import {
  copilotApi,
  type ChatSourceAttribution,
  type CopilotActionButton,
  type CopilotAnswerMode,
  type CopilotConversation,
  type CopilotMessage,
  type FeedbackRating,
} from './copilot.api';
import { mapCopilotError } from './errors';
import { FocusBadge } from './FocusBadge';
import { buildOutboundContext } from './focus';
import { getPageAwareSuggestions } from './pageSuggestions';
import { useApplicationContextStore } from './store';
import { useAssistantHealth } from './useAssistantHealth';
import { useSpeechRecognition } from './useSpeechRecognition';

/** Dispatched when the assistant asks to open the native create-session form. */
export const OPEN_CREATE_SESSION_EVENT = 'ednov:open-create-session';

type MessageAttachment = {
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

type ThreadMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
  actions?: CopilotActionButton[];
  sources?: ChatSourceAttribution[];
  answerMode?: CopilotAnswerMode | null;
  confirmationId?: string;
  interrupted?: boolean;
};

type PendingAttachment = {
  id: string;
  name: string;
  text?: string;
  mimeType?: string;
  size?: number;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
};

/** Backend stores attachments as `\n\n[Attached: a.pdf, b.docx]` on user message content. */
const ATTACHED_MARKER_RE = /\n*\s*\[Attached:\s*([^\]]+)\]\s*$/i;

function parseAttachedMarker(content: string): {
  text: string;
  attachments: MessageAttachment[];
} {
  const match = content.match(ATTACHED_MARKER_RE);
  if (!match) {
    return { text: content, attachments: [] };
  }
  const names = match[1]
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  return {
    text: content.slice(0, match.index).replace(/\s+$/, ''),
    attachments: names.map((name) => ({ name })),
  };
}

function fileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : '';
}

function fileTypeLabel(name: string, mimeType?: string | null): string {
  const ext = fileExtension(name);
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'PDF';
  if (
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ||
    (mimeType?.startsWith('image/') ?? false)
  ) {
    return 'Image';
  }
  if (['doc', 'docx'].includes(ext)) return 'Document';
  if (['txt', 'md', 'markdown'].includes(ext)) return 'Texte';
  if (ext === 'csv' || mimeType === 'text/csv') return 'CSV';
  return 'Document';
}

function formatFileSize(bytes?: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function AttachmentFileIcon({
  name,
  mimeType,
  className,
}: {
  name: string;
  mimeType?: string | null;
  className?: string;
}) {
  const label = fileTypeLabel(name, mimeType);
  if (label === 'Image') return <FileImage className={className} aria-hidden />;
  if (label === 'PDF' || label === 'Document' || label === 'Texte' || label === 'CSV') {
    return <FileText className={className} aria-hidden />;
  }
  return <File className={className} aria-hidden />;
}

function AttachmentChip({
  attachment,
  variant,
  onRemove,
  removeDisabled,
  status,
  error,
}: {
  attachment: MessageAttachment;
  variant: 'user' | 'assistant' | 'compose';
  onRemove?: () => void;
  removeDisabled?: boolean;
  status?: PendingAttachment['status'];
  error?: string;
}) {
  const typeLabel = fileTypeLabel(attachment.name, attachment.mimeType);
  const sizeLabel = formatFileSize(attachment.size);
  const meta = [typeLabel, sizeLabel].filter(Boolean).join(' · ');
  const isError = status === 'error';
  const isUploading = status === 'uploading';

  return (
    <div
      className={cn(
        'flex max-w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left',
        variant === 'user' &&
          'border-white/30 bg-white/15 text-white shadow-sm backdrop-blur-[2px]',
        variant === 'assistant' && 'border-border/80 bg-background text-foreground shadow-sm',
        variant === 'compose' &&
          !isError &&
          'border-border bg-background text-foreground shadow-sm',
        variant === 'compose' &&
          isError &&
          'border-destructive/40 bg-destructive/5 text-destructive',
      )}
      title={error || attachment.name}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          variant === 'user' && 'bg-white/20',
          variant === 'assistant' && 'bg-muted',
          variant === 'compose' &&
            !isError &&
            'bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_12%,transparent)] text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]',
          variant === 'compose' && isError && 'bg-destructive/10',
        )}
      >
        {isUploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <AttachmentFileIcon
            name={attachment.name}
            mimeType={attachment.mimeType}
            className="h-3.5 w-3.5"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium leading-tight">
          {attachment.name}
        </span>
        <span
          className={cn(
            'block truncate text-[10px] leading-tight',
            variant === 'user' ? 'text-white/75' : 'text-muted-foreground',
            isError && 'text-destructive/80',
          )}
        >
          {isError ? error || 'Erreur' : isUploading ? 'Traitement…' : meta}
        </span>
      </span>
      {onRemove && (
        <button
          type="button"
          className={cn(
            'shrink-0 rounded-md p-0.5 transition disabled:opacity-40',
            variant === 'user'
              ? 'hover:bg-white/20'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          aria-label={`Retirer ${attachment.name}`}
          onClick={onRemove}
          disabled={removeDisabled}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

const ACCEPT =
  '.pdf,.doc,.docx,.txt,.md,.markdown,.csv,application/pdf,text/plain,text/csv,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function formatConversationTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'À l’instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Il y a ${diffD} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Pinned first, then newest updatedAt — matches backend list order. */
function sortConversations(list: CopilotConversation[]): CopilotConversation[] {
  return [...list].sort((a, b) => {
    const pinnedDelta = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinnedDelta !== 0) return pinnedDelta;
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });
}

const THREADS_WIDTH_KEY = 'zupdeco-assistant-threads-width';
const THREADS_COLLAPSED_KEY = 'zupdeco-assistant-threads-collapsed';
const THREADS_WIDTH_MIN = 180;
const THREADS_WIDTH_MAX = 360;
const THREADS_WIDTH_DEFAULT = 224;

const PANEL_SIZE_KEY = 'zupdeco-assistant-panel-size';
const PANEL_WIDTH_MIN = 360;
const PANEL_HEIGHT_MIN = 420;
const PANEL_WIDTH_DEFAULT = 640;
const PANEL_HEIGHT_DEFAULT = 620;
const PANEL_MARGIN = 24; // matches bottom-6 / right-6

type PanelSize = { width: number; height: number };
type PanelResizeEdge = 'n' | 'w' | 'nw';

function panelSizeBounds(): { maxW: number; maxH: number } {
  if (typeof window === 'undefined') {
    return { maxW: PANEL_WIDTH_DEFAULT, maxH: PANEL_HEIGHT_DEFAULT };
  }
  return {
    maxW: Math.max(280, window.innerWidth - PANEL_MARGIN * 2),
    maxH: Math.max(280, window.innerHeight - PANEL_MARGIN * 2),
  };
}

function clampPanelSize(size: PanelSize): PanelSize {
  const { maxW, maxH } = panelSizeBounds();
  const minW = Math.min(PANEL_WIDTH_MIN, maxW);
  const minH = Math.min(PANEL_HEIGHT_MIN, maxH);
  return {
    width: Math.min(maxW, Math.max(minW, Math.round(size.width))),
    height: Math.min(maxH, Math.max(minH, Math.round(size.height))),
  };
}

function readStoredPanelSize(): PanelSize {
  try {
    const raw = localStorage.getItem(PANEL_SIZE_KEY);
    if (!raw) {
      return clampPanelSize({
        width: PANEL_WIDTH_DEFAULT,
        height: PANEL_HEIGHT_DEFAULT,
      });
    }
    const parsed = JSON.parse(raw) as Partial<PanelSize>;
    return clampPanelSize({
      width: Number(parsed.width) || PANEL_WIDTH_DEFAULT,
      height: Number(parsed.height) || PANEL_HEIGHT_DEFAULT,
    });
  } catch {
    return clampPanelSize({
      width: PANEL_WIDTH_DEFAULT,
      height: PANEL_HEIGHT_DEFAULT,
    });
  }
}

function readStoredThreadsWidth(): number {
  try {
    const raw = localStorage.getItem(THREADS_WIDTH_KEY);
    const n = raw ? Number(raw) : THREADS_WIDTH_DEFAULT;
    if (!Number.isFinite(n)) return THREADS_WIDTH_DEFAULT;
    return Math.min(THREADS_WIDTH_MAX, Math.max(THREADS_WIDTH_MIN, n));
  } catch {
    return THREADS_WIDTH_DEFAULT;
  }
}

function readStoredThreadsCollapsed(): boolean {
  try {
    return localStorage.getItem(THREADS_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Floating Copilot panel — intentionally not using Radix Dialog.
 * Dialog + overridden translate/position caused a composeRefs setState loop
 * ("Maximum update depth exceeded").
 */
export const CopilotShell: React.FC = () => {
  const open = useApplicationContextStore((s) => s.ui.open);
  const docked = useApplicationContextStore((s) => s.ui.docked);
  const maximized = useApplicationContextStore((s) => s.ui.maximized);
  const panelPosition = useApplicationContextStore((s) => s.ui.position);
  const context = useApplicationContextStore((s) => s.context);
  const focus = useApplicationContextStore((s) => s.focus);
  const outboundContext = React.useMemo(
    () => buildOutboundContext(context, focus),
    [context, focus],
  );
  const openAssistant = useApplicationContextStore((s) => s.openAssistant);
  const minimizeAssistant = useApplicationContextStore((s) => s.minimizeAssistant);
  const restoreAssistant = useApplicationContextStore((s) => s.restoreAssistant);
  const closeAssistant = useApplicationContextStore((s) => s.closeAssistant);
  const setMaximized = useApplicationContextStore((s) => s.setMaximized);
  const consumePendingPrompt = useApplicationContextStore((s) => s.consumePendingPrompt);
  const health = useAssistantHealth(true);
  const pageSuggestions = React.useMemo(
    () => getPageAwareSuggestions(outboundContext),
    [outboundContext],
  );

  const [conversations, setConversations] = React.useState<CopilotConversation[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ThreadMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = React.useState<
    Record<string, FeedbackRating>
  >({});
  const composeInputRef = React.useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const [renameTarget, setRenameTarget] = React.useState<CopilotConversation | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [renameSaving, setRenameSaving] = React.useState(false);
  const [menuBusyId, setMenuBusyId] = React.useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null);
  const [threadsCollapsed, setThreadsCollapsed] = React.useState(readStoredThreadsCollapsed);
  const [threadsWidth, setThreadsWidth] = React.useState(readStoredThreadsWidth);
  const [isResizingThreads, setIsResizingThreads] = React.useState(false);
  const [panelSize, setPanelSize] = React.useState<PanelSize>(readStoredPanelSize);
  const [panelResizeEdge, setPanelResizeEdge] = React.useState<PanelResizeEdge | null>(null);
  const panelResizeOrigin = React.useRef<{
    edge: PanelResizeEdge;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const pendingHandled = React.useRef(false);
  const inputRef = React.useRef(input);
  const speech = useSpeechRecognition();

  inputRef.current = input;

  const loadConversations = React.useCallback(async () => {
    try {
      const list = await copilotApi.listConversations();
      setConversations(sortConversations(list));
    } catch {
      // Auth may still be bootstrapping; ignore silently.
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      void loadConversations();
    }
  }, [open, loadConversations]);

  React.useEffect(() => {
    if (!open) {
      pendingHandled.current = false;
      return;
    }
    if (pendingHandled.current) return;
    const pending = consumePendingPrompt();
    if (!pending) return;
    pendingHandled.current = true;
    setInput(pending.prompt);
    if (pending.autoSend) {
      void sendText(pending.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once on open
  }, [open, consumePendingPrompt]);

  React.useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) {
          minimizeAssistant();
        } else if (docked) {
          restoreAssistant();
        } else {
          openAssistant();
        }
        return;
      }
      if (meta && e.key === '/') {
        e.preventDefault();
        if (!open) {
          if (docked) restoreAssistant();
          else openAssistant();
        }
        window.setTimeout(() => composeInputRef.current?.focus(), 0);
        return;
      }
      if (open && e.key === 'Escape') {
        minimizeAssistant();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, docked, openAssistant, restoreAssistant, minimizeAssistant]);

  React.useEffect(() => {
    if (speech.error) {
      setError(speech.error);
    }
  }, [speech.error]);

  React.useEffect(() => {
    try {
      localStorage.setItem(THREADS_COLLAPSED_KEY, threadsCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [threadsCollapsed]);

  React.useEffect(() => {
    try {
      localStorage.setItem(THREADS_WIDTH_KEY, String(threadsWidth));
    } catch {
      // ignore
    }
  }, [threadsWidth]);

  React.useEffect(() => {
    try {
      localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify(panelSize));
    } catch {
      // ignore
    }
  }, [panelSize]);

  React.useEffect(() => {
    const onResize = () => {
      setPanelSize((prev) => clampPanelSize(prev));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    if (!isResizingThreads) return;

    const onMove = (e: MouseEvent) => {
      const panel = document.getElementById('zupdeco-assistant-panel');
      if (!panel) return;
      const left = panel.getBoundingClientRect().left;
      const next = Math.min(
        THREADS_WIDTH_MAX,
        Math.max(THREADS_WIDTH_MIN, e.clientX - left),
      );
      setThreadsWidth(next);
    };
    const onUp = () => setIsResizingThreads(false);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizingThreads]);

  React.useEffect(() => {
    if (!panelResizeEdge) return;
    const origin = panelResizeOrigin.current;
    if (!origin) return;

    const cursor =
      origin.edge === 'nw' ? 'nwse-resize' : origin.edge === 'n' ? 'ns-resize' : 'ew-resize';

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - origin.startX;
      const dy = e.clientY - origin.startY;
      // Panel is anchored bottom-right: drag left/up to grow.
      let nextW = origin.startW;
      let nextH = origin.startH;
      if (origin.edge === 'w' || origin.edge === 'nw') {
        nextW = origin.startW - dx;
      }
      if (origin.edge === 'n' || origin.edge === 'nw') {
        nextH = origin.startH - dy;
      }
      setPanelSize(clampPanelSize({ width: nextW, height: nextH }));
    };
    const onUp = () => {
      panelResizeOrigin.current = null;
      setPanelResizeEdge(null);
    };

    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [panelResizeEdge]);

  const beginPanelResize = (edge: PanelResizeEdge) => (e: React.MouseEvent) => {
    if (maximized) return;
    e.preventDefault();
    e.stopPropagation();
    panelResizeOrigin.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startW: panelSize.width,
      startH: panelSize.height,
    };
    setPanelResizeEdge(edge);
  };

  const toggleThreadsCollapsed = () => setThreadsCollapsed((v) => !v);

  const selectConversation = async (id: string) => {
    setError(null);
    setConversationId(id);
    setAttachments([]);
    setEditingMessageId(null);
    try {
      const detail = await copilotApi.getConversation(id);
      const mapped: ThreadMessage[] = (detail.messages ?? [])
        .filter((m: CopilotMessage) => m.role === 'user' || m.role === 'assistant')
        .map((m: CopilotMessage) => {
          const parsed = parseAttachedMarker(m.content ?? '');
          const sources = Array.isArray(m.sources) ? m.sources : undefined;
          const answerMode =
            m.answerMode ??
            deriveAnswerMode(sources) ??
            null;
          const rawActions = m.actions as
            | CopilotActionButton[]
            | { buttons?: CopilotActionButton[]; confirmationId?: string }
            | null
            | undefined;
          const actions = Array.isArray(rawActions)
            ? rawActions
            : Array.isArray(rawActions?.buttons)
              ? rawActions.buttons
              : undefined;
          const confirmationId =
            !Array.isArray(rawActions) && rawActions?.confirmationId
              ? rawActions.confirmationId
              : undefined;
          return {
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: parsed.text,
            attachments: parsed.attachments.length ? parsed.attachments : undefined,
            sources,
            answerMode,
            actions,
            confirmationId,
          };
        });
      setMessages(mapped);
      try {
        const feedback = await copilotApi.listFeedback(id);
        const ratings: Record<string, FeedbackRating> = {};
        for (const [messageId, row] of Object.entries(feedback)) {
          if (row?.rating) ratings[messageId] = row.rating;
        }
        setFeedbackByMessage(ratings);
      } catch {
        // feedback is optional
      }
    } catch (e) {
      setError(mapCopilotError(e).display);
    }
  };

  const startNewConversation = () => {
    abortRef.current?.abort();
    speech.stop();
    setConversationId(null);
    setMessages([]);
    setInput('');
    setAttachments([]);
    setEditingMessageId(null);
    setError(null);
    setLoading(false);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setInput('');
  };

  const beginEditMessage = (msg: ThreadMessage) => {
    if (loading || msg.role !== 'user') return;
    if (msg.id.startsWith('local-')) {
      setError('Attendez la fin de l’enregistrement du message avant de le modifier.');
      return;
    }
    if (!conversationId) {
      setError('Impossible de modifier hors conversation enregistrée.');
      return;
    }
    setEditingMessageId(msg.id);
    setInput(parseAttachedMarker(msg.content).text);
    setError(null);
    speech.stop();
  };

  const copyMessage = async (msg: ThreadMessage) => {
    const text = parseAttachedMarker(msg.content ?? '').text.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msg.id);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === msg.id ? null : current));
      }, 1800);
    } catch {
      setError('Impossible de copier le message.');
    }
  };

  const openRename = (conversation: CopilotConversation) => {
    setRenameTarget(conversation);
    setRenameValue(conversation.title?.trim() || '');
    setError(null);
  };

  const saveRename = async () => {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (!next) {
      setError('Le titre ne peut pas être vide.');
      return;
    }
    setRenameSaving(true);
    try {
      const updated = await copilotApi.renameConversation(renameTarget.id, next);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === updated.id ? { ...c, title: updated.title ?? next } : c,
        ),
      );
      setRenameTarget(null);
      setRenameValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de renommer la conversation');
    } finally {
      setRenameSaving(false);
    }
  };

  const deleteConversation = async (conversation: CopilotConversation) => {
    const label = conversation.title?.trim() || 'Sans titre';
    const confirmed = window.confirm(
      `Supprimer la conversation « ${label} » ? Cette action est irréversible.`,
    );
    if (!confirmed) return;

    setMenuBusyId(conversation.id);
    try {
      await copilotApi.deleteConversation(conversation.id);
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
      if (conversationId === conversation.id) {
        startNewConversation();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de supprimer la conversation');
    } finally {
      setMenuBusyId(null);
    }
  };

  const togglePinConversation = async (conversation: CopilotConversation) => {
    const nextPinned = !conversation.pinned;
    setMenuBusyId(conversation.id);
    setError(null);
    try {
      const updated = await copilotApi.setConversationPinned(conversation.id, nextPinned);
      setConversations((prev) =>
        sortConversations(
          prev.map((c) =>
            c.id === updated.id
              ? {
                  ...c,
                  pinned: updated.pinned ?? nextPinned,
                  updatedAt: updated.updatedAt || c.updatedAt,
                }
              : c,
          ),
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : nextPinned
            ? 'Impossible d’épingler la conversation'
            : 'Impossible de désépingler la conversation',
      );
    } finally {
      setMenuBusyId(null);
    }
  };

  const attachFiles = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 5 - attachments.length);
    if (!list.length) {
      setError('Maximum 5 fichiers par message.');
      return;
    }

    for (const file of list) {
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setAttachments((prev) => [...prev, { id, name: file.name, status: 'uploading' }]);
      try {
        const parsed = await copilotApi.parseAttachment(file);
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  id,
                  name: parsed.name || file.name,
                  text: parsed.text,
                  mimeType: parsed.mimeType,
                  size: parsed.size,
                  status: 'ready',
                }
              : a,
          ),
        );
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Impossible de lire ce fichier';
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: 'error', error: message } : a,
          ),
        );
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    const readyAttachments = attachments.filter(
      (a) => a.status === 'ready' && a.text?.trim(),
    );
    const editId = editingMessageId;
    if ((!trimmed && !readyAttachments.length) || loading) return;
    if (attachments.some((a) => a.status === 'uploading')) {
      setError('Attendez la fin du traitement des fichiers.');
      return;
    }
    if (editId && !conversationId) {
      setError('Impossible de modifier sans conversation.');
      return;
    }

    speech.stop();
    setInput('');
    setError(null);
    setEditingMessageId(null);
    const attachmentPayload = readyAttachments.map((a) => ({
      name: a.name,
      text: a.text!.trim(),
    }));
    setAttachments([]);

    const messageAttachments: MessageAttachment[] = readyAttachments.map((a) => ({
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
    }));

    const userMsg: ThreadMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      attachments: messageAttachments.length ? messageAttachments : undefined,
    };
    const assistantId = `local-assistant-${Date.now()}`;

    if (editId) {
      // Keep messages up to (but excluding) the edited one, then append the new turn.
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === editId);
        const keep = idx >= 0 ? prev.slice(0, idx) : prev;
        return [...keep, userMsg, { id: assistantId, role: 'assistant', content: '' }];
      });
    } else {
      setMessages((m) => [...m, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
    }
    setLoading(true);

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await copilotApi.streamChat(
        {
          message: trimmed || 'Analyse le(s) fichier(s) joint(s).',
          conversationId: conversationId ?? undefined,
          applicationContext: outboundContext,
          attachments: attachmentPayload.length ? attachmentPayload : undefined,
          editMessageId: editId ?? undefined,
        },
        {
          signal: abort.signal,
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + token }
                  : msg,
              ),
            );
          },
          onComplete: (payload) => {
            if (payload.conversationId) {
              setConversationId(payload.conversationId);
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      id: payload.messageId || msg.id,
                      content: payload.answer || msg.content,
                      sources: payload.sources,
                      answerMode:
                        payload.answerMode ??
                        deriveAnswerMode(payload.sources) ??
                        null,
                      actions: payload.actions,
                      confirmationId: payload.confirmationId,
                      interrupted: payload.interrupted,
                    }
                  : msg.id === userMsg.id && payload.userMessageId
                    ? { ...msg, id: payload.userMessageId as string }
                    : msg,
              ),
            );
            void loadConversations();
          },
          onInterrupted: () => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, interrupted: true } : msg,
              ),
            );
          },
          onError: (message) => {
            setError(message);
          },
        },
      );
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      // Keep conversation/messages on transient failures — never wipe the thread.
      setError(mapCopilotError(e).display);
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (
    msg: ThreadMessage,
    action: CopilotActionButton,
  ) => {
    if (loading) return;
    const confirmationId =
      (typeof action.payload?.confirmationId === 'string'
        ? action.payload.confirmationId
        : undefined) || msg.confirmationId;
    const approved =
      action.payload?.approved === true ||
      action.id.toLowerCase().includes('confirm') ||
      action.style === 'primary';

    // Rich confirmation preview for mutating actions.
    if (action.requiresConfirmation || confirmationId) {
      const preview =
        msg.content?.trim() ||
        action.label ||
        'Confirmer cette action ?';
      const ok = window.confirm(
        `${preview}\n\n—\nConfirmer « ${action.label} » ?`,
      );
      if (!ok) return;
    }

    setLoading(true);
    setError(null);
    const assistantId = `local-assistant-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await copilotApi.streamChat(
        {
          message: action.label,
          conversationId: conversationId ?? undefined,
          applicationContext: outboundContext,
          ...(confirmationId
            ? {
                confirm: {
                  confirmationId,
                  approved: Boolean(approved),
                },
              }
            : {
                action: {
                  toolId: action.toolId,
                  actionId: action.id,
                  payload: action.payload,
                },
              }),
        },
        {
          signal: abort.signal,
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((row) =>
                row.id === assistantId
                  ? { ...row, content: row.content + token }
                  : row,
              ),
            );
          },
          onComplete: (payload) => {
            if (payload.conversationId) setConversationId(payload.conversationId);
            setMessages((prev) =>
              prev.map((row) =>
                row.id === assistantId
                  ? {
                      ...row,
                      id: payload.messageId || row.id,
                      content: payload.answer || row.content,
                      sources: payload.sources,
                      answerMode:
                        payload.answerMode ??
                        deriveAnswerMode(payload.sources) ??
                        null,
                      actions: payload.actions,
                      confirmationId: payload.confirmationId,
                    }
                  : row,
              ),
            );
            void loadConversations();
          },
          onError: (message) => setError(message),
        },
      );
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setError(mapCopilotError(e).display);
    } finally {
      setLoading(false);
    }
  };

  const fabLabel = docked ? 'Reprendre ZUPdeCo Assistant' : 'Ouvrir ZUPdeCo Assistant';
  const canSend =
    !loading &&
    !attachments.some((a) => a.status === 'uploading') &&
    (Boolean(input.trim()) || attachments.some((a) => a.status === 'ready'));

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => (docked ? restoreAssistant() : openAssistant())}
          className={cn(
            'fixed bottom-6 right-6 z-[1050] flex items-center gap-2 rounded-full',
            'bg-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))] text-white shadow-lg',
            'h-14 pl-4 pr-5 transition hover:scale-105',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          )}
          aria-label={fabLabel}
          title={fabLabel}
        >
          <Sparkles className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">ZUPdeCo</span>
        </button>
      )}

      {open && (
        <div className="pointer-events-none fixed inset-0 z-[1100]" role="presentation">
          <div
            id="zupdeco-assistant-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ednov-copilot-title"
            style={
              maximized
                ? undefined
                : {
                    width: panelSize.width,
                    height: panelSize.height,
                    maxWidth: `calc(100vw - ${PANEL_MARGIN * 2}px)`,
                    maxHeight: `calc(100vh - ${PANEL_MARGIN * 2}px)`,
                    right: panelPosition?.right ?? PANEL_MARGIN,
                    bottom: panelPosition?.bottom ?? PANEL_MARGIN,
                  }
            }
            className={cn(
              'pointer-events-auto relative flex flex-col overflow-hidden border bg-background shadow-2xl',
              maximized
                ? 'fixed inset-4 rounded-xl'
                : 'fixed rounded-2xl',
              panelResizeEdge && 'select-none',
            )}
          >
            {/* Panel free-resize handles (desktop only; hidden when maximized) */}
            {!maximized && (
              <>
                <div
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Redimensionner la hauteur"
                  title="Glisser pour changer la hauteur"
                  onMouseDown={beginPanelResize('n')}
                  className={cn(
                    'absolute inset-x-3 top-0 z-20 hidden h-1.5 cursor-ns-resize sm:block',
                    'bg-transparent transition-colors hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_35%,transparent)]',
                    panelResizeEdge === 'n' &&
                      'bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_45%,transparent)]',
                  )}
                />
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Redimensionner la largeur"
                  title="Glisser pour changer la largeur"
                  onMouseDown={beginPanelResize('w')}
                  className={cn(
                    'absolute inset-y-3 left-0 z-20 hidden w-1.5 cursor-ew-resize sm:block',
                    'bg-transparent transition-colors hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_35%,transparent)]',
                    panelResizeEdge === 'w' &&
                      'bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_45%,transparent)]',
                  )}
                />
                <div
                  role="separator"
                  aria-label="Redimensionner la fenêtre"
                  title="Glisser pour redimensionner"
                  onMouseDown={beginPanelResize('nw')}
                  className={cn(
                    'group absolute left-0 top-0 z-30 hidden h-4 w-4 cursor-nwse-resize sm:block',
                    'rounded-br-md',
                    panelResizeEdge === 'nw' &&
                      'bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_20%,transparent)]',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-1 top-1 h-2.5 w-2.5',
                      'border-l-2 border-t-2 border-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_55%,transparent)]',
                      'opacity-70 transition-opacity group-hover:opacity-100',
                      panelResizeEdge === 'nw' &&
                        'opacity-100 border-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]',
                    )}
                  />
                </div>
              </>
            )}

            <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Bot className="h-5 w-5 shrink-0 text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]" />
                <div className="min-w-0">
                  <h2 id="ednov-copilot-title" className="flex items-center gap-2 text-base font-semibold">
                    ZUPdeCo Assistant
                    <span
                      className={cn(
                        'inline-flex h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background',
                        health.status === 'ok' && 'bg-emerald-500',
                        health.status === 'down' && 'bg-red-500',
                        (health.status === 'unknown' || health.status === 'checking') &&
                          'bg-amber-400',
                      )}
                      title={
                        health.status === 'ok'
                          ? 'Assistant en ligne'
                          : health.status === 'down'
                            ? 'Assistant hors ligne — clic pour réessayer'
                            : 'Vérification de l’assistant…'
                      }
                      role="status"
                      aria-label={
                        health.status === 'ok'
                          ? 'Assistant online'
                          : health.status === 'down'
                            ? 'Assistant offline'
                            : 'Checking assistant health'
                      }
                      onClick={() => void health.retryNow()}
                    />
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {outboundContext.page?.title || 'Assistant'}
                    {outboundContext.selection?.primary
                      ? ` · ${outboundContext.selection.primary.label || outboundContext.selection.primary.type}`
                      : outboundContext.focus?.scope === 'global'
                        ? ' · Global'
                        : ''}
                    {maximized ? ' · Plein écran' : docked ? ' · Ancré' : ' · Flottant'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={startNewConversation}
                  title="Nouvelle conversation"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMaximized(!maximized)}
                  title={maximized ? 'Réduire' : 'Agrandir'}
                >
                  {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={minimizeAssistant}
                  title="Réduire"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeAssistant}
                  title="Fermer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1">
              {/* Collapsed threads rail */}
              {threadsCollapsed && (
                <aside
                  className={cn(
                    'hidden w-12 shrink-0 flex-col items-center border-r py-2 sm:flex',
                    'bg-gradient-to-b from-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_6%,transparent)] via-muted/20 to-muted/40',
                  )}
                >
                  <button
                    type="button"
                    onClick={toggleThreadsCollapsed}
                    title="Agrandir les conversations"
                    aria-label="Agrandir les conversations"
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/80',
                      'text-muted-foreground shadow-sm transition hover:text-foreground',
                    )}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={startNewConversation}
                    title="Nouvelle conversation"
                    aria-label="Nouvelle conversation"
                    className={cn(
                      'mt-2 flex h-8 w-8 items-center justify-center rounded-lg',
                      'text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))] transition hover:bg-background/80',
                    )}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </button>
                  <div className="mt-3 flex flex-1 flex-col items-center gap-1 overflow-hidden px-1">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {conversations.length} fil{conversations.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </aside>
              )}

              {/* Expanded threads panel */}
              {!threadsCollapsed && (
                <>
                  <aside
                    style={{ width: threadsWidth }}
                    className={cn(
                      'hidden shrink-0 flex-col border-r sm:flex',
                      'bg-gradient-to-b from-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_6%,transparent)] via-muted/20 to-muted/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Conversations
                        </p>
                        <p className="text-[11px] text-muted-foreground/80">
                          {conversations.length} fil{conversations.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={startNewConversation}
                          title="Nouvelle conversation"
                          aria-label="Nouvelle conversation"
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background/80',
                            'text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))] shadow-sm transition',
                            'hover:border-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]/40 hover:bg-background',
                          )}
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={toggleThreadsCollapsed}
                          title="Réduire les conversations"
                          aria-label="Réduire les conversations"
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background/80',
                            'text-muted-foreground shadow-sm transition hover:text-foreground',
                          )}
                        >
                          <ChevronsLeft className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
                      {conversations.map((c) => {
                        const active = conversationId === c.id;
                        const title = c.title?.trim() || 'Sans titre';
                        const isPinned = Boolean(c.pinned);
                        return (
                          <div
                            key={c.id}
                            className={cn(
                              'group relative flex items-stretch gap-0.5 rounded-xl border transition-all',
                              active
                                ? [
                                    'border-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_35%,transparent)]',
                                    'bg-background shadow-sm',
                                    'ring-1 ring-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_18%,transparent)]',
                                  ]
                                : 'border-transparent bg-background/40 hover:border-border/70 hover:bg-background/80',
                            )}
                          >
                            {active && (
                              <span
                                aria-hidden
                                className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => void selectConversation(c.id)}
                              className="min-w-0 flex-1 px-2.5 py-2 text-left"
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className={cn(
                                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                                    active
                                      ? 'bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_14%,transparent)] text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]'
                                      : 'bg-muted text-muted-foreground',
                                  )}
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start gap-1">
                                    {isPinned && (
                                      <Pin
                                        className="mt-0.5 h-3 w-3 shrink-0 fill-current text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]"
                                        aria-label="Épinglée"
                                      />
                                    )}
                                    <span
                                      className={cn(
                                        'line-clamp-2 min-w-0 flex-1 text-[12px] leading-snug',
                                        active
                                          ? 'font-semibold text-foreground'
                                          : 'font-medium text-foreground/90',
                                      )}
                                    >
                                      {title}
                                    </span>
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                    {formatConversationTime(c.updatedAt || c.createdAt)}
                                  </span>
                                </span>
                              </div>
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'mr-1 mt-1 self-start rounded-md p-1 text-muted-foreground transition',
                                    'hover:bg-muted hover:text-foreground',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]/40',
                                    'opacity-70 group-hover:opacity-100 data-[state=open]:opacity-100',
                                    active && 'opacity-100',
                                  )}
                                  aria-label={`Actions pour ${title}`}
                                  disabled={menuBusyId === c.id}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {menuBusyId === c.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-[1200] min-w-40" sideOffset={4}>
                                <DropdownMenuItem
                                  onSelect={() => openRename(c)}
                                  className="gap-2 text-xs"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Renommer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => void togglePinConversation(c)}
                                  className="gap-2 text-xs"
                                >
                                  <Pin
                                    className={cn(
                                      'h-3.5 w-3.5',
                                      isPinned && 'fill-current',
                                    )}
                                  />
                                  {isPinned ? 'Désépingler' : 'Épingler'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => void deleteConversation(c)}
                                  className="gap-2 text-xs text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                      {!conversations.length && (
                        <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/80 text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))] shadow-sm">
                            <MessageSquare className="h-4 w-4" />
                          </span>
                          <p className="text-xs font-medium text-foreground">Aucune conversation</p>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Posez une question pour démarrer un nouveau fil.
                          </p>
                        </div>
                      )}
                    </div>
                  </aside>

                  {/* Drag handle to resize threads panel */}
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Redimensionner les conversations"
                    title="Glisser pour agrandir ou réduire"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsResizingThreads(true);
                    }}
                    className={cn(
                      'hidden w-1.5 shrink-0 cursor-col-resize items-stretch sm:flex',
                      'bg-transparent transition-colors hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_35%,transparent)]',
                      isResizingThreads &&
                        'bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_45%,transparent)]',
                    )}
                  />
                </>
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <FocusBadge />
                <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  {!messages.length && !loading && (
                    <div className="space-y-3 py-6 text-center">
                      <Sparkles className="mx-auto h-8 w-8 text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]" />
                      <div className="space-y-1 px-2">
                        <p className="text-sm font-medium text-foreground">
                          Comment puis-je vous aider ?
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Suggestions adaptées au focus et à{' '}
                          {outboundContext.page?.title ||
                            outboundContext.page?.interfaceId ||
                            'cette page'}
                          . Raccourcis : Ctrl+K ouvrir · Ctrl+/ focus · Ctrl+Entrée envoyer.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {pageSuggestions.map((item) => (
                          <Button
                            key={`${item.label}-${item.prompt}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void sendText(item.prompt)}
                          >
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const copied = copiedMessageId === msg.id;
                    const parsed = parseAttachedMarker(msg.content ?? '');
                    const displayText = parsed.text;
                    const msgAttachments =
                      msg.attachments?.length
                        ? msg.attachments
                        : parsed.attachments;
                    const canCopy = Boolean(displayText.trim());
                    const hasBubbleBody =
                      Boolean(displayText) || msgAttachments.length > 0 || (loading && !displayText);
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'group/msg flex gap-2',
                          msg.role === 'user' ? 'justify-end' : 'justify-start',
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <Bot className="mt-1 h-4 w-4 shrink-0 text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]" />
                        )}
                        <div
                          className={cn(
                            'flex max-w-[85%] flex-col gap-1',
                            msg.role === 'user' ? 'items-end' : 'items-start',
                          )}
                        >
                          {hasBubbleBody && (
                            <div
                              className={cn(
                                'rounded-2xl px-3.5 py-2.5 text-sm',
                                msg.role === 'user'
                                  ? 'bg-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))] text-white'
                                  : 'bg-muted/90',
                                editingMessageId === msg.id &&
                                  'ring-2 ring-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))] ring-offset-1',
                              )}
                            >
                              {displayText ? (
                                msg.role === 'assistant' ? (
                                  <AssistantMarkdown content={displayText} />
                                ) : (
                                  <div className="whitespace-pre-wrap">{displayText}</div>
                                )
                              ) : loading && msg.role === 'assistant' ? (
                                <div className="text-muted-foreground">…</div>
                              ) : null}
                              {msgAttachments.length > 0 && (
                                <ul
                                  className={cn(
                                    'flex flex-col gap-1.5',
                                    displayText ? 'mt-2' : undefined,
                                  )}
                                >
                                  {msgAttachments.map((att, idx) => (
                                    <li key={`${att.name}-${idx}`} className="min-w-0">
                                      <AttachmentChip
                                        attachment={att}
                                        variant={msg.role === 'user' ? 'user' : 'assistant'}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                          {msg.role === 'assistant' && msg.interrupted && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">
                              Réponse partielle — connexion interrompue.
                            </p>
                          )}
                          {msg.role === 'assistant' &&
                            !loading &&
                            Boolean(displayText.trim()) && (
                              <AnswerMeta
                                messageId={msg.id}
                                sources={msg.sources}
                                answerMode={msg.answerMode}
                                initialRating={feedbackByMessage[msg.id]}
                              />
                            )}
                          {msg.role === 'assistant' &&
                            msg.actions &&
                            msg.actions.length > 0 &&
                            !loading && (
                              <div className="flex flex-wrap gap-1.5">
                                {msg.actions.map((action) => (
                                  <Button
                                    key={`${msg.id}-${action.id}`}
                                    type="button"
                                    size="sm"
                                    variant={
                                      action.style === 'destructive'
                                        ? 'destructive'
                                        : action.style === 'secondary'
                                          ? 'outline'
                                          : 'default'
                                    }
                                    className="h-7 text-xs"
                                    onClick={() => void runAction(msg, action)}
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          <div
                            className={cn(
                              'flex items-center gap-0.5',
                              'opacity-100 transition sm:opacity-0 sm:group-hover/msg:opacity-100 sm:group-focus-within/msg:opacity-100',
                              (copied || editingMessageId === msg.id) && 'sm:opacity-100',
                            )}
                          >
                            {canCopy && (
                              <button
                                type="button"
                                onClick={() => void copyMessage(msg)}
                                className={cn(
                                  'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground',
                                  'transition hover:bg-muted hover:text-foreground',
                                  copied &&
                                    'text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]',
                                )}
                                title={copied ? 'Copié' : 'Copier le message'}
                                aria-label={copied ? 'Message copié' : 'Copier le message'}
                              >
                                {copied ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            {msg.role === 'user' &&
                              !loading &&
                              !msg.id.startsWith('local-') &&
                              conversationId && (
                                <button
                                  type="button"
                                  onClick={() => beginEditMessage(msg)}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground',
                                    'transition hover:bg-muted hover:text-foreground',
                                    editingMessageId === msg.id &&
                                      'text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]',
                                  )}
                                  title="Modifier le message"
                                  aria-label="Modifier le message"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Modifier
                                </button>
                              )}
                          </div>
                        </div>
                        {msg.role === 'user' && <User className="mt-1 h-4 w-4 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {error && (
                  <div className="flex items-start justify-between gap-2 border-t px-4 py-2">
                    <p className="text-xs text-destructive">{error}</p>
                    {health.status === 'down' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 text-xs"
                        onClick={() => void health.retryNow()}
                      >
                        Réessayer
                      </Button>
                    )}
                  </div>
                )}

                {messages.length > 0 && pageSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t px-3 pt-2">
                    {pageSuggestions.slice(0, 4).map((item) => (
                      <Button
                        key={`${item.label}-${item.prompt}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        disabled={loading}
                        onClick={() => void sendText(item.prompt)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                )}

                {editingMessageId && (
                  <div className="flex items-center justify-between gap-2 border-t bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_8%,transparent)] px-3 py-2 text-xs">
                    <span className="font-medium text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]">
                      Modification d’un message — envoyez pour régénérer la suite
                    </span>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md px-2 py-1 text-muted-foreground hover:bg-background hover:text-foreground"
                      disabled={loading}
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {attachments.length > 0 && (
                  <ul className="flex flex-wrap gap-2 border-t px-3 pt-2.5">
                    {attachments.map((att) => (
                      <li key={att.id} className="min-w-[10rem] max-w-full flex-1 sm:max-w-[14rem]">
                        <AttachmentChip
                          attachment={{
                            name: att.name,
                            mimeType: att.mimeType,
                            size: att.size,
                          }}
                          variant="compose"
                          status={att.status}
                          error={att.error}
                          onRemove={() => removeAttachment(att.id)}
                          removeDisabled={loading}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  className="flex items-end gap-1.5 border-t p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendText(input);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept={ACCEPT}
                    multiple
                    onChange={(e) => void attachFiles(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={loading || attachments.length >= 5}
                    title="Joindre un fichier (PDF, DOCX, TXT, MD, CSV)"
                    aria-label="Joindre un fichier"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'shrink-0',
                      speech.isListening &&
                        'bg-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]/15 text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]',
                      !speech.isSupported && 'opacity-40',
                    )}
                    disabled={loading || !speech.isSupported}
                    title={
                      speech.isSupported
                        ? speech.isListening
                          ? 'Arrêter — le message sera envoyé à la fin'
                          : 'Parler : envoi automatique à la fin de la phrase'
                        : 'Saisie vocale non supportée dans ce navigateur'
                    }
                    aria-label={
                      speech.isListening
                        ? 'Arrêter l’enregistrement'
                        : 'Saisie vocale (envoi automatique)'
                    }
                    onClick={() =>
                      speech.toggle((transcript) => {
                        const combined = [inputRef.current.trim(), transcript]
                          .filter(Boolean)
                          .join(' ');
                        setInput(combined);
                        void sendText(combined);
                      })
                    }
                  >
                    {speech.isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  <textarea
                    ref={composeInputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        void sendText(input);
                        return;
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendText(input);
                      }
                    }}
                    rows={2}
                    placeholder={
                      speech.isListening
                        ? 'Écoute… envoi automatique à la fin'
                        : editingMessageId
                          ? 'Modifiez le message puis envoyez…'
                          : 'Posez une question — le focus suffit, sans retaper le nom…'
                    }
                    className="min-h-[2.75rem] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]"
                    disabled={loading}
                  />
                  <Button type="submit" size="icon" disabled={!canSend}>
                    <SendHorizontal className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {renameTarget && (
            <div
              className="pointer-events-auto fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4"
              role="presentation"
              onClick={() => {
                if (!renameSaving) {
                  setRenameTarget(null);
                  setRenameValue('');
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="rename-conversation-title"
                className="w-full max-w-sm rounded-xl border bg-background p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 id="rename-conversation-title" className="text-sm font-semibold">
                  Renommer la conversation
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choisissez un titre court pour la retrouver facilement.
                </p>
                <input
                  autoFocus
                  value={renameValue}
                  maxLength={120}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveRename();
                    }
                    if (e.key === 'Escape' && !renameSaving) {
                      setRenameTarget(null);
                      setRenameValue('');
                    }
                  }}
                  className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]"
                  placeholder="Titre de la conversation"
                  disabled={renameSaving}
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={renameSaving}
                    onClick={() => {
                      setRenameTarget(null);
                      setRenameValue('');
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={renameSaving || !renameValue.trim()}
                    onClick={() => void saveRename()}
                  >
                    {renameSaving ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
