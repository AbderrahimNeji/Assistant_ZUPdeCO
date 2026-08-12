"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ChatApi } from "@/features/chat/services/chat.api";
import { useChatStore } from "@/features/chat/store";
import type {
  ChatActionRequest,
  ChatAttachmentPayload,
  ChatConfirmRequest,
  ChatResponse,
  ChatSource,
  Message,
  Source,
} from "@/features/chat/types";
import { mapSource } from "@/features/chat/utils/map-message";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

type SendMessageInput = {
  message: string;
  conversationId: string;
  attachments?: ChatAttachmentPayload[];
  action?: ChatActionRequest;
  confirm?: ChatConfirmRequest;
  regenerate?: boolean;
  editMessageId?: string;
  /** User message that owns assistant siblings (regenerate). */
  parentMessageId?: string;
  executionMode?: "interactive" | "background";
};

type MutateOptions = {
  onSuccess?: (data: ChatResponse) => void;
  onError?: (error: unknown) => void;
};

function mapChatSources(
  sources: ChatSource[] | undefined,
  messageId: string,
): Source[] | undefined {
  if (!sources?.length) return undefined;

  return sources.map((source, index) => mapSource(source, messageId, index));
}

function isViewingConversation(conversationId: string): boolean {
  return useChatStore.getState().selectedConversation?.id === conversationId;
}

function displayUserContent(
  message: string,
  attachments?: ChatAttachmentPayload[],
) {
  if (!attachments?.length) return message;
  const names = attachments.map((item) => item.name).join(", ");
  if (!message.trim()) {
    return `Attached: ${names}`;
  }
  return `${message}\n\n[Attached: ${names}]`;
}

function applyAssistantPayload(
  fallbackId: string,
  conversationId: string,
  data: ChatResponse,
  status?: Message["status"],
): Message {
  const id = data.messageId || fallbackId;
  return {
    id,
    conversationId: data.conversationId || conversationId,
    role: "assistant",
    content: data.answer ?? "",
    createdAt: new Date().toISOString(),
    parentMessageId: data.parentMessageId ?? null,
    branchId: data.branchId,
    version: data.version ?? 1,
    sources: mapChatSources(data.sources, id),
    actions: data.actions?.length ? data.actions : undefined,
    confirmationId: data.confirmationId,
    executionTrace: data.executionTrace,
    suggestedActions: data.suggestedActions?.length
      ? data.suggestedActions
      : undefined,
    ...(status ? { status } : {}),
  };
}

function patchConversationPreview(
  conversationId: string,
  message: string,
  attachments?: ChatAttachmentPayload[],
  meta?: Pick<ChatResponse, "activeBranchId" | "activeLeafId">,
) {
  const preview = displayUserContent(message, attachments).slice(0, 120);
  const selected = useChatStore.getState().selectedConversation;
  const titleSeed =
    message.trim() || attachments?.[0]?.name || "New conversation";
  const titlePatch =
    selected?.id === conversationId &&
    (!selected.title || selected.title === "New conversation")
      ? { title: titleSeed.slice(0, 40) }
      : {};

  useChatStore.getState().updateConversation(conversationId, {
    preview,
    updatedAt: new Date().toISOString(),
    ...(meta?.activeBranchId
      ? { activeBranchId: meta.activeBranchId }
      : {}),
    ...(meta?.activeLeafId ? { activeLeafId: meta.activeLeafId } : {}),
    ...titlePatch,
  });
}

function upsertMessage(messages: Message[], next: Message): Message[] {
  const index = messages.findIndex((item) => item.id === next.id);
  if (index === -1) return [...messages, next];
  const copy = messages.slice();
  copy[index] = next;
  return copy;
}

export function useChat() {
  const queryClient = useQueryClient();
  const addMessage = useChatStore((state) => state.addMessage);
  const setMessages = useChatStore((state) => state.setMessages);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const setActivePath = useChatStore((state) => state.setActivePath);
  const setTyping = useChatStore((state) => state.setTyping);
  const setChatPending = useChatStore((state) => state.setChatPending);

  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const mutate = useCallback(
    (variables: SendMessageInput, options?: MutateOptions) => {
      void (async () => {
        if (inFlightRef.current) return;

        const {
          message,
          conversationId,
          attachments,
          action,
          confirm,
          regenerate,
          editMessageId,
          parentMessageId,
          executionMode,
        } = variables;

        abortRef.current?.abort();
        const abort = new AbortController();
        abortRef.current = abort;
        inFlightRef.current = true;

        const previousMessages = useChatStore.getState().messages;
        const previousLeaf = useChatStore.getState().activeLeafId;
        const previousBranch = useChatStore.getState().activeBranchId;

        const optimisticUserId = `optimistic-user-${crypto.randomUUID()}`;
        const assistantId = `assistant-${crypto.randomUUID()}`;
        const leafParentId =
          parentMessageId ??
          useChatStore.getState().activeLeafId ??
          null;

        setIsPending(true);
        setIsStreaming(true);
        setChatPending(true);
        setTyping(false);

        if (isViewingConversation(conversationId)) {
          if (regenerate && parentMessageId) {
            addMessage({
              id: assistantId,
              conversationId,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
              parentMessageId,
              status: "streaming",
            });
            setActivePath({ activeLeafId: assistantId });
          } else if (editMessageId) {
            const original = previousMessages.find(
              (item) => item.id === editMessageId,
            );
            addMessage({
              id: optimisticUserId,
              conversationId,
              role: "user",
              content: displayUserContent(message, attachments),
              createdAt: new Date().toISOString(),
              parentMessageId: original?.parentMessageId ?? null,
              status: "sending",
            });
            addMessage({
              id: assistantId,
              conversationId,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
              parentMessageId: optimisticUserId,
              status: "streaming",
            });
            setActivePath({ activeLeafId: assistantId });
          } else {
            addMessage({
              id: optimisticUserId,
              conversationId,
              role: "user",
              content: displayUserContent(message, attachments),
              createdAt: new Date().toISOString(),
              parentMessageId: leafParentId,
              status: "sending",
            });
            addMessage({
              id: assistantId,
              conversationId,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
              parentMessageId: optimisticUserId,
              status: "streaming",
            });
            setActivePath({ activeLeafId: assistantId });
          }
        }

        let accumulated = "";
        let finalPayload: ChatResponse | null = null;
        let streamError: string | null = null;
        let wasInterrupted = false;
        let terminalEvent = false;

        const finishAssistant = (
          data: ChatResponse,
          status?: Message["status"],
        ) => {
          const next = applyAssistantPayload(
            assistantId,
            conversationId,
            data,
            status,
          );

          let messages = useChatStore
            .getState()
            .messages.filter(
              (item) =>
                item.id !== optimisticUserId && item.id !== assistantId,
            );

          if (!regenerate) {
            const confirmedUser: Message = {
              id: data.userMessageId ?? `user-${crypto.randomUUID()}`,
              conversationId,
              role: "user",
              content: displayUserContent(message, attachments),
              createdAt: new Date().toISOString(),
              parentMessageId:
                editMessageId != null
                  ? (previousMessages.find((item) => item.id === editMessageId)
                      ?.parentMessageId ?? null)
                  : leafParentId,
              branchId: data.branchId,
              version: 1,
            };
            messages = upsertMessage(messages, confirmedUser);
          }

          messages = upsertMessage(messages, next);
          setMessages(messages);
          setActivePath({
            activeLeafId: data.activeLeafId ?? next.id,
            activeBranchId: data.activeBranchId ?? next.branchId ?? null,
          });
        };

        try {
          await ChatApi.sendStream(
            {
              message,
              conversationId,
              attachments,
              action,
              confirm,
              regenerate,
              editMessageId,
              parentMessageId,
              executionMode,
            },
            {
              signal: abort.signal,
              onEvent: (event) => {
                if (!isViewingConversation(conversationId)) return;

                if (event.type === "token") {
                  accumulated += event.text;
                  updateMessage(assistantId, {
                    content: accumulated,
                    status: "streaming",
                  });
                  return;
                }

                if (event.type === "complete") {
                  terminalEvent = true;
                  finalPayload = event.payload;
                  finishAssistant(event.payload);
                  return;
                }

                if (event.type === "interrupted") {
                  terminalEvent = true;
                  wasInterrupted = true;
                  finalPayload = event.payload;
                  finishAssistant(event.payload, "interrupted");
                  return;
                }

                if (event.type === "error") {
                  terminalEvent = true;
                  streamError =
                    event.message || "Generation stopped unexpectedly.";
                  updateMessage(assistantId, {
                    content: accumulated,
                    status: "error",
                  });
                  if (!regenerate) {
                    updateMessage(optimisticUserId, { status: undefined });
                  }
                }
              },
            },
          );

          if (abort.signal.aborted && !terminalEvent) {
            wasInterrupted = true;
            if (isViewingConversation(conversationId)) {
              updateMessage(assistantId, {
                content: accumulated,
                status: "interrupted",
              });
              if (!regenerate) {
                updateMessage(optimisticUserId, { status: undefined });
              }
            }
          } else if (!terminalEvent && !finalPayload) {
            streamError = "Generation stopped unexpectedly.";
            if (isViewingConversation(conversationId)) {
              updateMessage(assistantId, {
                content: accumulated,
                status: "error",
              });
              if (!regenerate) {
                updateMessage(optimisticUserId, { status: undefined });
              }
            }
          }

          if (streamError && !wasInterrupted) {
            options?.onError?.(new Error(streamError));
          } else if (finalPayload) {
            patchConversationPreview(
              conversationId,
              message,
              attachments,
              finalPayload,
            );
            options?.onSuccess?.(finalPayload);
          } else if (wasInterrupted) {
            patchConversationPreview(conversationId, message, attachments);
            options?.onSuccess?.({
              success: true,
              conversationId,
              answer: accumulated,
              sources: [],
            });
          }

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.CHAT.MESSAGES(conversationId),
            }),
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.CONVERSATIONS.ROOT,
            }),
          ]);
        } catch (error) {
          const aborted =
            abort.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError") ||
            (error instanceof Error && error.name === "AbortError");

          if (aborted) {
            wasInterrupted = true;
            if (isViewingConversation(conversationId)) {
              updateMessage(assistantId, {
                content: accumulated,
                status: "interrupted",
              });
              if (!regenerate) {
                updateMessage(optimisticUserId, { status: undefined });
              }
            }
            patchConversationPreview(conversationId, message, attachments);
            options?.onSuccess?.({
              success: true,
              conversationId,
              answer: accumulated,
              sources: [],
            });
          } else {
            if (isViewingConversation(conversationId)) {
              if (accumulated) {
                updateMessage(assistantId, {
                  content: accumulated,
                  status: "error",
                });
                if (!regenerate) {
                  updateMessage(optimisticUserId, { status: undefined });
                }
              } else {
                setMessages(previousMessages);
                setActivePath({
                  activeLeafId: previousLeaf,
                  activeBranchId: previousBranch,
                });
              }
            }
            options?.onError?.(error);
          }
        } finally {
          if (abortRef.current === abort) {
            abortRef.current = null;
          }
          inFlightRef.current = false;
          setIsPending(false);
          setIsStreaming(false);
          setChatPending(false);
          setTyping(false);
        }
      })();
    },
    [
      addMessage,
      queryClient,
      setActivePath,
      setChatPending,
      setMessages,
      setTyping,
      updateMessage,
    ],
  );

  return {
    mutate,
    stop,
    isPending,
    isStreaming,
    isError: false,
  };
}
