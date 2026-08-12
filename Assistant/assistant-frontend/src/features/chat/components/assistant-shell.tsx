"use client";

import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConversationsMenuButton } from "@/features/chat/components/assistant-top-nav";
import { ChatArea } from "@/features/chat/components/chat-area";
import type { ChatSuggestion } from "@/features/chat/components/chat-welcome";
import { ConversationPanel } from "@/features/chat/components/conversation-panel";
import { DocumentDropOverlay } from "@/features/chat/components/document-drop-overlay";
import {
  MessageComposer,
  type ComposerAttachment,
  type MessageComposerHandle,
} from "@/features/chat/components/message-composer";
import { RenameConversationDialog } from "@/features/chat/components/rename-conversation-dialog";
import { WorkflowJobsPanel } from "@/features/chat/components/workflow-jobs-panel";
import { useChat } from "@/features/chat/hooks/use-chat";
import { useClearConversations } from "@/features/chat/hooks/use-clear-conversations";
import { useConversations } from "@/features/chat/hooks/use-conversations";
import { useCreateConversation } from "@/features/chat/hooks/use-create-conversation";
import { useDeleteConversation } from "@/features/chat/hooks/use-delete-conversation";
import { useSpeechRecognition } from "@/features/chat/hooks/use-speech-recognition";
import { useWorkflowJobs } from "@/features/chat/hooks/use-workflow-jobs";
import {
  usePinConversation,
  useRenameConversation,
} from "@/features/chat/hooks/use-update-conversation";
import { ChatApi } from "@/features/chat/services/chat.api";
import { ConversationApi } from "@/features/chat/services/conversation.api";
import { EvaluationApi } from "@/features/chat/services/evaluation.api";
import { MessagesApi } from "@/features/chat/services/messages.service";
import { useChatStore } from "@/features/chat/store";
import type {
  ChatActionButton,
  ChatAttachmentPayload,
  Conversation,
  Message,
  SuggestedAction,
} from "@/features/chat/types";
import type { FeedbackRating } from "@/features/chat/services/evaluation.api";
import {
  buildConversationMarkdown,
  downloadTextFile,
  exportConversationPdf,
  slugifyFilename,
} from "@/features/chat/utils/conversation-management";
import { getConversationDisplayTitle } from "@/features/chat/utils/display";
import {
  getActivePath,
  listBranches,
} from "@/features/chat/utils/conversation-tree";
import { AppShell, ConfirmDialog } from "@/features/shared/components";
import { toast } from "@/features/shared/store/toast.store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const PANEL_ID = "assistant-conversation-panel";
const MOBILE_PANEL_ID = `${PANEL_ID}-mobile`;
const MAX_CHAT_ATTACHMENTS = 5;
const MAX_CHAT_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const ALLOWED_CHAT_EXTENSIONS = /\.(pdf|docx|txt|md|markdown|csv)$/i;
const ALLOWED_CHAT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

export function AssistantShell() {
  const router = useRouter();
  const conversations = useChatStore((state) => state.conversations);
  const selectedConversation = useChatStore(
    (state) => state.selectedConversation,
  );
  const messages = useChatStore((state) => state.messages);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const firstUserMessage = useChatStore((state) => {
    for (const message of state.messages) {
      if (message.role === "user") return message.content;
    }
    return null;
  });
  const isTyping = useChatStore((state) => state.isTyping);
  const activeLeafId = useChatStore((state) => state.activeLeafId);
  const activeBranchId = useChatStore((state) => state.activeBranchId);
  const allMessages = useChatStore((state) => state.messages);

  const conversationsQuery = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const renameConversation = useRenameConversation();
  const pinConversation = usePinConversation();
  const clearConversations = useClearConversations();
  const chat = useChat();
  const workflowJobs = useWorkflowJobs(selectedConversation?.id);

  const composerRef = useRef<MessageComposerHandle>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [runInBackground, setRunInBackground] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );
  const [lastFailedAttachments, setLastFailedAttachments] = useState<
    ChatAttachmentPayload[]
  >([]);
  const speech = useSpeechRecognition();
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [pendingRename, setPendingRename] = useState<Conversation | null>(null);
  const [pendingClearAll, setPendingClearAll] = useState(false);
  const [exportingConversationId, setExportingConversationId] = useState<
    string | null
  >(null);
  const draftRef = useRef(draft);
  const attachmentsRef = useRef(attachments);
  const sendVoiceTranscriptRef = useRef<(transcript: string) => void>(() => {});

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    const conversationId = selectedConversation?.id;
    if (!conversationId) {
      setAttachments([]);
      return;
    }

    let cancelled = false;

    void ConversationApi.listAttachments(conversationId)
      .then((rows) => {
        if (cancelled) return;
        setAttachments(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            size: row.size ?? 0,
            status: "ready" as const,
            progress: 100,
            persisted: true,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setAttachments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedConversation?.id]);

  const hasConversation = Boolean(selectedConversation?.id);
  const isSending = chat.isPending;
  const isStreaming = chat.isStreaming;
  const isWaiting = isSending || isTyping;
  const isBusy = createConversation.isPending || isSending;

  const headerTitle = getConversationDisplayTitle(
    selectedConversation,
    firstUserMessage,
  );

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((conversation) => {
        const query = searchQuery.toLowerCase();
        const displayTitle = getConversationDisplayTitle(conversation);
        return (
          displayTitle.toLowerCase().includes(query) ||
          conversation.title.toLowerCase().includes(query) ||
          conversation.preview.toLowerCase().includes(query) ||
          (conversation.searchText?.toLowerCase().includes(query) ?? false)
        );
      })
    : conversations;

  const busyConversationId =
    exportingConversationId ??
    (deleteConversation.isPending
      ? (deleteConversation.variables ?? null)
      : null) ??
    (renameConversation.isPending
      ? (renameConversation.variables?.conversationId ?? null)
      : null) ??
    (pinConversation.isPending
      ? (pinConversation.variables?.conversationId ?? null)
      : null);

  function handleSelectConversation(conversation: Conversation) {
    setActionError(null);
    setSendError(null);
    setLastFailedMessage(null);
    selectConversation(conversation);
    setMobilePanelOpen(false);
  }

  function handleNewConversation() {
    setActionError(null);
    setSendError(null);
    setLastFailedMessage(null);
    createConversation.mutate(undefined, {
      onError: (error) => {
        setActionError(getActionErrorMessage(error, "create"));
      },
      onSuccess: () => {
        setMobilePanelOpen(false);
      },
    });
  }

  function handleDeleteConversation(conversation: Conversation) {
    setPendingDelete(conversation);
  }

  function confirmDeleteConversation() {
    if (!pendingDelete) return;

    setActionError(null);
    deleteConversation.mutate(pendingDelete.id, {
      onError: (error) => {
        setActionError(getActionErrorMessage(error, "delete"));
      },
      onSettled: () => {
        setPendingDelete(null);
      },
    });
  }

  function handleRenameConversation(conversation: Conversation) {
    setPendingRename(conversation);
  }

  function confirmRenameConversation(title: string) {
    if (!pendingRename) return;

    setActionError(null);
    renameConversation.mutate(
      { conversationId: pendingRename.id, title },
      {
        onError: (error) => {
          setActionError(getActionErrorMessage(error, "rename"));
        },
        onSuccess: () => {
          toast({
            title: "Conversation renamed",
            variant: "success",
          });
          setPendingRename(null);
        },
      },
    );
  }

  function handleTogglePin(conversation: Conversation) {
    setActionError(null);
    const nextPinned = !conversation.pinned;
    pinConversation.mutate(
      { conversationId: conversation.id, pinned: nextPinned },
      {
        onError: (error) => {
          setActionError(getActionErrorMessage(error, "pin"));
        },
        onSuccess: () => {
          toast({
            title: nextPinned ? "Conversation pinned" : "Conversation unpinned",
            variant: "success",
          });
        },
      },
    );
  }

  async function resolveMessagesForExport(
    conversation: Conversation,
  ): Promise<Message[]> {
    if (
      selectedConversation?.id === conversation.id &&
      messages.length > 0
    ) {
      return getActivePath(
        messages.filter((message) => message.status !== "sending"),
        activeLeafId ?? selectedConversation.activeLeafId,
      );
    }

    const payload = await MessagesApi.listByConversation(conversation.id);
    return getActivePath(payload.messages, payload.activeLeafId);
  }

  async function handleExportMarkdown(conversation: Conversation) {
    setActionError(null);
    setExportingConversationId(conversation.id);

    try {
      const exportMessages = await resolveMessagesForExport(conversation);
      const title = getConversationDisplayTitle(conversation);
      const markdown = buildConversationMarkdown(title, exportMessages);
      downloadTextFile(
        `${slugifyFilename(title)}.md`,
        markdown,
        "text/markdown;charset=utf-8",
      );
      toast({
        title: "Markdown exported",
        description: "Your conversation download has started.",
        variant: "success",
      });
    } catch (error) {
      setActionError(getActionErrorMessage(error, "export"));
    } finally {
      setExportingConversationId(null);
    }
  }

  async function handleExportPdf(conversation: Conversation) {
    setActionError(null);
    setExportingConversationId(conversation.id);

    try {
      const exportMessages = await resolveMessagesForExport(conversation);
      const title = getConversationDisplayTitle(conversation);
      const markdown = buildConversationMarkdown(title, exportMessages);
      exportConversationPdf(title, markdown);
      toast({
        title: "Print dialog opened",
        description: "Use Save as PDF in the print dialog.",
        variant: "default",
      });
    } catch (error) {
      setActionError(getActionErrorMessage(error, "export"));
    } finally {
      setExportingConversationId(null);
    }
  }

  function handleClearAllRequest() {
    setPendingClearAll(true);
  }

  function confirmClearAll() {
    setActionError(null);
    clearConversations.mutate(undefined, {
      onError: (error) => {
        setActionError(getActionErrorMessage(error, "clear"));
      },
      onSettled: () => {
        setPendingClearAll(false);
      },
    });
  }

  function getPendingAttachments(
    source: ComposerAttachment[] = attachmentsRef.current,
  ): ChatAttachmentPayload[] {
    return source
      .filter(
        (attachment) =>
          !attachment.persisted &&
          attachment.status === "ready" &&
          Boolean(attachment.text?.trim()),
      )
      .map((attachment) => ({
        name: attachment.name,
        text: attachment.text!.trim(),
      }));
  }

  function keepPersistedAttachments(
    source: ComposerAttachment[] = attachmentsRef.current,
  ) {
    return source.filter((attachment) => attachment.persisted);
  }

  async function refreshConversationAttachments(conversationId: string) {
    const rows = await ConversationApi.listAttachments(conversationId);
    setAttachments(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        size: row.size ?? 0,
        status: "ready" as const,
        progress: 100,
        persisted: true,
      })),
    );
  }

  function sendMessage(
    raw: string,
    conversationIdOverride?: string,
    nextAttachments: ChatAttachmentPayload[] = [],
  ) {
    const message = raw.trim();
    const conversationId =
      conversationIdOverride ?? selectedConversation?.id;

    if ((!message && !nextAttachments.length) || !conversationId || isSending) {
      return;
    }

    const payload = {
      message,
      conversationId,
      attachments: nextAttachments.length ? nextAttachments : undefined,
      executionMode: runInBackground
        ? ("background" as const)
        : ("interactive" as const),
    };

    if (process.env.NODE_ENV === "development") {
      console.debug("[chat] payload before sending", payload);
    }

    setSendError(null);
    setDraft("");
    // Keep already-persisted conversation attachments visible.
    setAttachments(keepPersistedAttachments());

    chat.mutate(payload, {
      onSuccess: (data) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("[chat] API response", data);
          console.debug("[chat] assistant message received", data.answer);
        }
        setLastFailedMessage(null);
        setLastFailedAttachments([]);
        setSendError(null);
        void refreshConversationAttachments(data.conversationId || conversationId);
        if (
          data.executionTrace?.executionMode === "background" ||
          data.executionTrace?.jobId
        ) {
          void workflowJobs.refetch();
        }
        queueMicrotask(() => composerRef.current?.focus());
      },
      onError: (error) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("[chat] send failed", error);
        }
        setDraft(message);
        setLastFailedMessage(message);
        setLastFailedAttachments(nextAttachments);
        setAttachments((current) => [
          ...keepPersistedAttachments(current),
          ...nextAttachments.map((attachment) => ({
            id: crypto.randomUUID(),
            name: attachment.name,
            size: attachment.text.length,
            status: "ready" as const,
            progress: 100,
            text: attachment.text,
            persisted: false,
          })),
        ]);
        setSendError(getSendErrorMessage(error));
      },
    });
  }

  function handleRegenerate(message: Message) {
    const conversationId = selectedConversation?.id;
    if (!conversationId || isSending) return;
    if (message.role !== "assistant") return;

    const parentMessageId = message.parentMessageId;
    if (!parentMessageId) return;

    const parent = messages.find((item) => item.id === parentMessageId);
    if (!parent || parent.role !== "user") return;

    setSendError(null);
    chat.mutate(
      {
        message: parent.content,
        conversationId,
        regenerate: true,
        parentMessageId,
      },
      {
        onError: (error) => {
          setSendError(getSendErrorMessage(error));
        },
      },
    );
  }

  function handleEditMessage(message: Message, nextContent: string) {
    const conversationId = selectedConversation?.id;
    if (!conversationId || isSending) return;
    if (message.role !== "user") return;

    setSendError(null);
    chat.mutate(
      {
        message: nextContent,
        conversationId,
        editMessageId: message.id,
      },
      {
        onError: (error) => {
          setSendError(getSendErrorMessage(error));
        },
      },
    );
  }

  async function handleSelectVersion(message: Message) {
    const conversationId = selectedConversation?.id;
    if (!conversationId || isSending) return;

    try {
      const updated = await ConversationApi.setActiveBranch(conversationId, {
        leafMessageId: message.id,
      });
      useChatStore.getState().setActivePath({
        activeLeafId: updated.activeLeafId ?? message.id,
        activeBranchId: updated.activeBranchId ?? message.branchId ?? null,
      });
      useChatStore.getState().updateConversation(conversationId, {
        activeLeafId: updated.activeLeafId,
        activeBranchId: updated.activeBranchId,
        branches: updated.branches,
        branchCount: updated.branchCount,
      });
    } catch (error) {
      setSendError(getSendErrorMessage(error));
    }
  }

  async function handleSelectBranch(branchId: string) {
    const conversationId = selectedConversation?.id;
    if (!conversationId || isSending) return;

    try {
      const updated = await ConversationApi.setActiveBranch(conversationId, {
        branchId,
      });
      useChatStore.getState().setActivePath({
        activeLeafId: updated.activeLeafId ?? null,
        activeBranchId: updated.activeBranchId ?? branchId,
      });
      useChatStore.getState().updateConversation(conversationId, {
        activeLeafId: updated.activeLeafId,
        activeBranchId: updated.activeBranchId,
        branches: updated.branches,
        branchCount: updated.branchCount,
      });
    } catch (error) {
      setSendError(getSendErrorMessage(error));
    }
  }

  function handleAssistantAction(action: ChatActionButton) {
    const conversationId = selectedConversation?.id;
    if (!conversationId || isSending) return;

    const confirmationId =
      typeof action.payload?.confirmationId === "string"
        ? action.payload.confirmationId
        : undefined;
    const isConfirmControl =
      action.id === "confirm" ||
      action.id === "cancel" ||
      Boolean(confirmationId);

    setSendError(null);

    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (lastAssistant && !isConfirmControl) {
      void EvaluationApi.recordEvent({
        type: "TOOL_ACTION",
        messageId: lastAssistant.id,
        conversationId,
        payload: {
          toolId: action.toolId,
          actionId: action.id,
          label: action.label,
        },
      }).catch(() => undefined);
    }

    if (isConfirmControl && confirmationId) {
      const approved =
        action.id === "confirm" || action.payload?.approved === true;
      chat.mutate({
        message: action.label,
        conversationId,
        confirm: { confirmationId, approved },
      });
      return;
    }

    chat.mutate({
      message: action.label,
      conversationId,
      action: {
        toolId: action.toolId,
        actionId: action.id,
        payload: action.payload,
      },
    });
  }

  function handleSuggestedNextAction(suggestion: SuggestedAction) {
    if (isBusy) return;

    const conversationId = selectedConversation?.id;
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (lastAssistant && conversationId) {
      void EvaluationApi.recordEvent({
        type: "SUGGESTION_CLICK",
        messageId: lastAssistant.id,
        conversationId,
        payload: {
          suggestionId: suggestion.id,
          suggestionType: suggestion.type,
          label: suggestion.label,
          toolId:
            typeof suggestion.payload.toolId === "string"
              ? suggestion.payload.toolId
              : undefined,
        },
      }).catch(() => undefined);
    }

    const payload = suggestion.payload ?? {};
    const message =
      typeof payload.message === "string" ? payload.message.trim() : "";
    const href = typeof payload.href === "string" ? payload.href.trim() : "";
    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    const toolId =
      typeof payload.toolId === "string" ? payload.toolId.trim() : "";

    if (
      suggestion.type === "navigation" ||
      suggestion.type === "external_link"
    ) {
      const target = href || url;
      if (!target) return;
      if (
        suggestion.type === "external_link" ||
        /^https?:\/\//i.test(target)
      ) {
        window.open(target, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(target);
      return;
    }

    if (suggestion.type === "follow_up_question") {
      const draftText = message || suggestion.label;
      setDraft(draftText);
      queueMicrotask(() => composerRef.current?.focus());
      return;
    }

    // tool_action | download — execute via chat / Action Engine when possible
    if (toolId) {
      if (!conversationId) {
        void ensureConversationAndSend(message || suggestion.label);
        return;
      }
      setSendError(null);
      chat.mutate({
        message: message || suggestion.label,
        conversationId,
        action: {
          toolId,
          actionId: suggestion.id,
          payload:
            payload.actionPayload &&
            typeof payload.actionPayload === "object" &&
            !Array.isArray(payload.actionPayload)
              ? (payload.actionPayload as Record<string, unknown>)
              : undefined,
        },
      });
      return;
    }

    if (message) {
      void ensureConversationAndSend(message);
      return;
    }

    setDraft(suggestion.label);
    queueMicrotask(() => composerRef.current?.focus());
  }

  async function handleMessageFeedback(input: {
    messageId: string;
    rating: FeedbackRating;
    comment?: string;
  }) {
    await EvaluationApi.submitFeedback(input);
    const setMessages = useChatStore.getState().setMessages;
    const current = useChatStore.getState().messages;
    setMessages(
      current.map((message) =>
        message.id === input.messageId
          ? { ...message, feedbackRating: input.rating }
          : message,
      ),
    );
    toast({
      title: input.rating === "HELPFUL" ? "Thanks for the feedback" : "Feedback sent",
      description:
        input.rating === "HELPFUL"
          ? "Glad this was helpful."
          : "We'll use this to improve the assistant.",
    });
  }

  async function ensureConversationAndSend(
    raw: string,
    nextAttachments: ChatAttachmentPayload[] = [],
  ) {
    const message = raw.trim();
    const hasPersisted = keepPersistedAttachments().length > 0;
    if ((!message && !nextAttachments.length && !hasPersisted) || isBusy) {
      return;
    }

    setActionError(null);
    setSendError(null);
    setLastFailedMessage(null);
    setLastFailedAttachments([]);
    setDraft("");
    setAttachments(keepPersistedAttachments());
    setMobilePanelOpen(false);

    try {
      let conversationId = selectedConversation?.id;

      if (!conversationId) {
        const conversation = await createConversation.mutateAsync(undefined);
        conversationId = conversation.id;
      }

      // Same send path for typed, voice, suggestions, and retries.
      sendMessage(message, conversationId, nextAttachments);
    } catch (error) {
      setDraft(message);
      setAttachments((current) => [
        ...keepPersistedAttachments(current),
        ...nextAttachments.map((attachment) => ({
          id: crypto.randomUUID(),
          name: attachment.name,
          size: attachment.text.length,
          status: "ready" as const,
          progress: 100,
          text: attachment.text,
          persisted: false,
        })),
      ]);
      setActionError(getActionErrorMessage(error, "create"));
    }
  }

  async function handleSuggestionSelect(suggestion: ChatSuggestion) {
    await ensureConversationAndSend(suggestion.prompt);
  }

  async function handleSend() {
    if (attachmentsRef.current.some((attachment) => attachment.status === "parsing")) {
      toast({
        title: "Still reading files",
        description: "Wait for attachments to finish before sending.",
        variant: "error",
      });
      return;
    }

    // Pass only not-yet-persisted attachments; conversation memory covers the rest.
    await ensureConversationAndSend(draftRef.current, getPendingAttachments());
  }

  function handleRetrySend() {
    if (!lastFailedMessage && !lastFailedAttachments.length) return;
    void ensureConversationAndSend(
      lastFailedMessage ?? "",
      lastFailedAttachments,
    );
  }

  async function handleAttachFiles(files: File[]) {
    const remaining = MAX_CHAT_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      toast({
        title: "Attachment limit reached",
        description: `You can attach up to ${MAX_CHAT_ATTACHMENTS} files per conversation.`,
        variant: "error",
      });
      return;
    }

    const selected = files.slice(0, remaining);
    const conversationId = selectedConversation?.id;

    for (const file of selected) {
      if (
        !ALLOWED_CHAT_MIME_TYPES.has(file.type) &&
        !ALLOWED_CHAT_EXTENSIONS.test(file.name)
      ) {
        toast({
          title: "Unsupported file",
          description: `“${file.name}” must be PDF, DOCX, TXT, Markdown, or CSV.`,
          variant: "error",
        });
        continue;
      }

      if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
        toast({
          title: "File too large",
          description: `“${file.name}” exceeds the 15 MB limit.`,
          variant: "error",
        });
        continue;
      }

      const id = crypto.randomUUID();
      setAttachments((current) => [
        ...current,
        {
          id,
          name: file.name,
          size: file.size,
          status: "parsing",
          progress: 0,
          persisted: false,
        },
      ]);

      try {
        if (conversationId) {
          // Persist immediately on the conversation (ChatGPT-style memory).
          const saved = await ConversationApi.uploadAttachment(
            conversationId,
            file,
            (progress) => {
              setAttachments((current) =>
                current.map((attachment) =>
                  attachment.id === id
                    ? { ...attachment, progress }
                    : attachment,
                ),
              );
            },
          );

          setAttachments((current) =>
            current.map((attachment) =>
              attachment.id === id
                ? {
                    id: saved.id,
                    name: saved.name,
                    size: saved.size ?? file.size,
                    status: "ready",
                    progress: 100,
                    persisted: true,
                  }
                : attachment,
            ),
          );
          continue;
        }

        // No conversation yet — parse locally and persist on first send.
        const parsed = await ChatApi.parseAttachment(file, (progress) => {
          setAttachments((current) =>
            current.map((attachment) =>
              attachment.id === id
                ? { ...attachment, progress }
                : attachment,
            ),
          );
        });

        setAttachments((current) =>
          current.map((attachment) =>
            attachment.id === id
              ? {
                  ...attachment,
                  status: "ready",
                  progress: 100,
                  text: parsed.text,
                  persisted: false,
                }
              : attachment,
          ),
        );
      } catch (error) {
        const description = isAxiosError(error)
          ? String(
              (error.response?.data as { message?: string | string[] })
                ?.message ?? "Couldn’t read this file.",
            )
          : "Couldn’t read this file.";

        setAttachments((current) =>
          current.map((attachment) =>
            attachment.id === id
              ? {
                  ...attachment,
                  status: "error",
                  error: Array.isArray(description)
                    ? description.join(", ")
                    : description,
                }
              : attachment,
          ),
        );
      }
    }
  }

  async function handleRemoveAttachment(id: string) {
    const target = attachmentsRef.current.find(
      (attachment) => attachment.id === id,
    );
    const conversationId = selectedConversation?.id;

    if (target?.persisted && conversationId) {
      try {
        await ConversationApi.removeAttachment(conversationId, id);
      } catch (error) {
        toast({
          title: "Couldn’t remove attachment",
          description: getSendErrorMessage(error),
          variant: "error",
        });
        return;
      }
    }

    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== id),
    );
  }

  function handleToggleSpeech() {
    speech.toggle((transcript) => {
      sendVoiceTranscriptRef.current(transcript);
    });
  }

  sendVoiceTranscriptRef.current = (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript) return;

    if (process.env.NODE_ENV === "development") {
      console.debug("[voice] transcript", trimmedTranscript);
    }

    // Compose from refs so we never read a stale React state snapshot.
    const currentDraft = draftRef.current.trim();
    const nextMessage = (
      currentDraft ? `${currentDraft} ${trimmedTranscript}` : trimmedTranscript
    ).slice(0, 4000);

    if (attachmentsRef.current.some((item) => item.status === "parsing")) {
      // Keep text in the composer until attachments finish; user can send next.
      setDraft(nextMessage);
      toast({
        title: "Still reading files",
        description:
          "Voice text was added to the composer. Send once attachments finish.",
        variant: "error",
      });
      queueMicrotask(() => composerRef.current?.focus());
      return;
    }

    const readyAttachments = getPendingAttachments();

    // Voice only produces text — reuse the exact typed-message send pipeline.
    void ensureConversationAndSend(nextMessage, readyAttachments);
  };

  const panelProps = {
    conversations: filteredConversations,
    totalConversationCount: conversations.length,
    searchQuery,
    selectedConversationId: selectedConversation?.id ?? null,
    onSelectConversation: handleSelectConversation,
    onNewConversation: handleNewConversation,
    onRenameConversation: handleRenameConversation,
    onTogglePinConversation: handleTogglePin,
    onExportMarkdown: (conversation: Conversation) => {
      void handleExportMarkdown(conversation);
    },
    onExportPdf: (conversation: Conversation) => {
      void handleExportPdf(conversation);
    },
    onDeleteConversation: handleDeleteConversation,
    onClearAllConversations: handleClearAllRequest,
    onClearSearch: () => setSearchQuery(""),
    onRetry: () => {
      void conversationsQuery.refetch();
    },
    isLoading: conversationsQuery.isLoading,
    isError: conversationsQuery.isError,
    isCreating: createConversation.isPending,
    isClearing: clearConversations.isPending,
    busyConversationId,
  };

  const pendingDeleteLabel = pendingDelete
    ? getConversationDisplayTitle(pendingDelete)
    : "";

  const pendingRenameTitle = pendingRename?.title?.trim() || "";

  return (
    <div className="relative">
      <DocumentDropOverlay />

      <AppShell
        mode="fill"
        leadingAction={
          <ConversationsMenuButton
            onClick={() => setMobilePanelOpen(true)}
            aria-expanded={mobilePanelOpen}
            aria-controls={MOBILE_PANEL_ID}
          />
        }
        centerSlot={
          <label className="relative block w-full">
            <span className="sr-only">Search conversations</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-brand-orange"
              aria-hidden
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
              className="h-10 rounded-full border-border bg-background pl-10 text-sm shadow-none"
            />
          </label>
        }
      >
        {actionError ? (
          <div
            role="alert"
            className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive"
          >
            {actionError}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          <ConversationPanel
            id={PANEL_ID}
            className="hidden w-64 shrink-0 border-r border-border lg:flex lg:w-[17.5rem]"
            {...panelProps}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <ChatArea
              title={headerTitle}
              conversationId={selectedConversation?.id ?? null}
              isWaiting={isWaiting}
              branchSelector={(() => {
                const branches =
                  selectedConversation?.branches?.length
                    ? selectedConversation.branches
                    : listBranches(allMessages);
                if (branches.length <= 1) return null;
                return (
                  <div
                    className="flex max-w-[14rem] flex-wrap items-center justify-end gap-1"
                    role="group"
                    aria-label="Conversation branches"
                  >
                    {branches.map((branch) => {
                      const active =
                        (activeBranchId ?? selectedConversation?.activeBranchId) ===
                        branch.id;
                      return (
                        <Button
                          key={branch.id}
                          type="button"
                          size="sm"
                          variant={active ? "secondary" : "ghost"}
                          className="h-7 rounded-lg px-2 text-[11px] font-medium"
                          disabled={isWaiting}
                          onClick={() => {
                            void handleSelectBranch(branch.id);
                          }}
                        >
                          {branch.label}
                        </Button>
                      );
                    })}
                  </div>
                );
              })()}
              onSuggestionSelect={handleSuggestionSelect}
              onAction={handleAssistantAction}
              onSuggestedAction={handleSuggestedNextAction}
              onRegenerate={handleRegenerate}
              onEdit={handleEditMessage}
              onSelectVersion={(message) => {
                void handleSelectVersion(message);
              }}
              onFeedback={handleMessageFeedback}
            />
            <WorkflowJobsPanel
              jobs={workflowJobs.jobs}
              onCancel={(jobId) => workflowJobs.cancel.mutate(jobId)}
              onRetry={(jobId) => workflowJobs.retry.mutate(jobId)}
              cancelPending={workflowJobs.cancel.isPending}
              retryPending={workflowJobs.retry.isPending}
            />
            <MessageComposer
              ref={composerRef}
              value={draft}
              onChange={setDraft}
              onSubmit={() => {
                void handleSend();
              }}
              onRetry={handleRetrySend}
              isSending={isBusy}
              isStreaming={isStreaming}
              onStop={() => chat.stop()}
              error={sendError}
              attachments={attachments}
              onAttachFiles={(files) => {
                void handleAttachFiles(files);
              }}
              onRemoveAttachment={(id) => {
                void handleRemoveAttachment(id);
              }}
              speechSupported={speech.isSupported}
              isListening={speech.isListening}
              speechError={speech.error}
              onToggleSpeech={handleToggleSpeech}
              runInBackground={runInBackground}
              onRunInBackgroundChange={setRunInBackground}
              placeholder={
                hasConversation
                  ? "Ask about documents, tutoring, or programs…"
                  : "Ask anything — a conversation will be created for you…"
              }
            />
          </div>
        </div>
      </AppShell>

      <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <SheetContent
          side="left"
          className="w-[min(100%,20rem)] gap-0 p-0 sm:max-w-sm"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Conversations</SheetTitle>
            <SheetDescription>
              Browse and select a conversation
            </SheetDescription>
          </SheetHeader>
          <ConversationPanel
            id={MOBILE_PANEL_ID}
            className="h-full"
            {...panelProps}
          />
        </SheetContent>
      </Sheet>

      <RenameConversationDialog
        key={pendingRename?.id ?? "rename-closed"}
        open={Boolean(pendingRename)}
        initialTitle={pendingRenameTitle}
        isSaving={renameConversation.isPending}
        onCancel={() => {
          if (!renameConversation.isPending) setPendingRename(null);
        }}
        onSave={confirmRenameConversation}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete conversation?"
        description={
          pendingDeleteLabel
            ? `“${pendingDeleteLabel}” will be permanently removed.`
            : "This conversation will be permanently removed."
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting…"
        isConfirming={deleteConversation.isPending}
        onCancel={() => {
          if (!deleteConversation.isPending) setPendingDelete(null);
        }}
        onConfirm={confirmDeleteConversation}
      />

      <ConfirmDialog
        open={pendingClearAll}
        title="Clear all conversations?"
        description="Every conversation and its messages will be permanently deleted for your account."
        confirmLabel="Clear all"
        confirmingLabel="Clearing…"
        isConfirming={clearConversations.isPending}
        onCancel={() => {
          if (!clearConversations.isPending) setPendingClearAll(false);
        }}
        onConfirm={confirmClearAll}
      />
    </div>
  );
}

type ConversationAction =
  | "create"
  | "delete"
  | "rename"
  | "pin"
  | "clear"
  | "export";

function getActionErrorMessage(
  error: unknown,
  action: ConversationAction,
): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length > 0) {
      return message.filter(Boolean).join(". ");
    }
    if (!error.response) {
      return "Unable to reach the server. Please try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  switch (action) {
    case "create":
      return "Couldn’t create the conversation. Please try again.";
    case "delete":
      return "Couldn’t delete the conversation. Please try again.";
    case "rename":
      return "Couldn’t rename the conversation. Please try again.";
    case "pin":
      return "Couldn’t update the pin. Please try again.";
    case "clear":
      return "Couldn’t clear conversations. Please try again.";
    case "export":
      return "Couldn’t export the conversation. Please try again.";
  }
}

function getSendErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length > 0) {
      return message.filter(Boolean).join(". ");
    }
    if (!error.response) {
      return "Unable to reach the server. Check your connection and try again.";
    }
    if (error.response.status >= 500) {
      return "The assistant is temporarily unavailable. Please try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Couldn’t send your message. Please try again.";
}
