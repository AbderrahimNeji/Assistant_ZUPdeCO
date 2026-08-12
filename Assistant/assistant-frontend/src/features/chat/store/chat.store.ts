import { create } from "zustand";

import type { Conversation, Message } from "@/features/chat/types";
import { sortConversations } from "@/features/chat/utils/conversation-management";
import { setLastConversationId } from "@/features/chat/utils/last-conversation";

type ChatState = {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  /** Full conversation tree (all branches). */
  messages: Message[];
  activeLeafId: string | null;
  activeBranchId: string | null;
  isTyping: boolean;
  isChatPending: boolean;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (
    conversationId: string,
    patch: Partial<Conversation>,
  ) => void;
  removeConversation: (conversationId: string) => void;
  clearConversations: () => void;
  selectConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  setActivePath: (input: {
    activeLeafId?: string | null;
    activeBranchId?: string | null;
  }) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, patch: Partial<Message>) => void;
  clearMessages: () => void;
  setTyping: (isTyping: boolean) => void;
  setChatPending: (isChatPending: boolean) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  activeLeafId: null,
  activeBranchId: null,
  isTyping: false,
  isChatPending: false,

  setConversations: (conversations) =>
    set((state) => {
      const previewById = new Map(
        state.conversations.map((conversation) => [
          conversation.id,
          conversation.preview,
        ]),
      );

      const merged = conversations.map((conversation) => ({
        ...conversation,
        preview: conversation.preview || previewById.get(conversation.id) || "",
      }));

      const selectedId = state.selectedConversation?.id;
      const nextSelected = selectedId
        ? (merged.find((conversation) => conversation.id === selectedId) ??
          state.selectedConversation)
        : state.selectedConversation;

      return {
        conversations: sortConversations(merged),
        selectedConversation: nextSelected
          ? {
              ...nextSelected,
              preview:
                nextSelected.preview ||
                previewById.get(nextSelected.id) ||
                "",
            }
          : null,
      };
    }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: sortConversations([
        conversation,
        ...state.conversations,
      ]),
    })),

  updateConversation: (conversationId, patch) =>
    set((state) => {
      const conversations = sortConversations(
        state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, ...patch }
            : conversation,
        ),
      );

      return {
        conversations,
        selectedConversation:
          state.selectedConversation?.id === conversationId
            ? { ...state.selectedConversation, ...patch }
            : state.selectedConversation,
      };
    }),

  removeConversation: (conversationId) =>
    set((state) => {
      const removingSelected =
        state.selectedConversation?.id === conversationId;

      if (removingSelected) {
        setLastConversationId(null);
      }

      return {
        conversations: state.conversations.filter(
          (conversation) => conversation.id !== conversationId,
        ),
        selectedConversation: removingSelected
          ? null
          : state.selectedConversation,
        messages: removingSelected ? [] : state.messages,
        activeLeafId: removingSelected ? null : state.activeLeafId,
        activeBranchId: removingSelected ? null : state.activeBranchId,
      };
    }),

  clearConversations: () => {
    setLastConversationId(null);
    set({
      conversations: [],
      selectedConversation: null,
      messages: [],
      activeLeafId: null,
      activeBranchId: null,
      isTyping: false,
      isChatPending: false,
    });
  },

  selectConversation: (conversation) => {
    setLastConversationId(conversation?.id ?? null);
    set({
      selectedConversation: conversation,
      messages: [],
      activeLeafId: conversation?.activeLeafId ?? null,
      activeBranchId: conversation?.activeBranchId ?? null,
      isTyping: false,
      isChatPending: false,
    });
  },

  setMessages: (messages) => set({ messages }),

  setActivePath: ({ activeLeafId, activeBranchId }) =>
    set((state) => ({
      activeLeafId:
        activeLeafId === undefined ? state.activeLeafId : activeLeafId,
      activeBranchId:
        activeBranchId === undefined ? state.activeBranchId : activeBranchId,
      selectedConversation: state.selectedConversation
        ? {
            ...state.selectedConversation,
            ...(activeLeafId !== undefined
              ? { activeLeafId }
              : {}),
            ...(activeBranchId !== undefined
              ? { activeBranchId }
              : {}),
          }
        : null,
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (messageId, patch) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === messageId ? { ...message, ...patch } : message,
      ),
    })),

  clearMessages: () =>
    set({ messages: [], activeLeafId: null, activeBranchId: null }),

  setTyping: (isTyping) => set({ isTyping }),

  setChatPending: (isChatPending) => set({ isChatPending }),
}));
