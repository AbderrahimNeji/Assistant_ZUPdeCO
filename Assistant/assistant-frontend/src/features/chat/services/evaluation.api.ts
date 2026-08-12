import { apiClient } from "@/features/shared/api/axios";
import { API_ROUTES } from "@/features/shared/api/api-routes";

export type FeedbackRating = "HELPFUL" | "NOT_HELPFUL";

export type ConversationFeedbackMap = Record<
  string,
  {
    rating: FeedbackRating;
    comment: string | null;
    updatedAt: string;
  }
>;

export const EvaluationApi = {
  async submitFeedback(input: {
    messageId: string;
    rating: FeedbackRating;
    comment?: string;
  }) {
    const response = await apiClient.post(API_ROUTES.EVALUATION.FEEDBACK, input);
    return response.data as {
      id: string;
      messageId: string;
      rating: FeedbackRating;
      comment: string | null;
    };
  },

  async listConversationFeedback(
    conversationId: string,
  ): Promise<ConversationFeedbackMap> {
    const response = await apiClient.get<ConversationFeedbackMap>(
      API_ROUTES.EVALUATION.FEEDBACK_CONVERSATION(conversationId),
    );
    return response.data ?? {};
  },

  async recordEvent(input: {
    type: "SUGGESTION_CLICK" | "TOOL_ACTION" | string;
    messageId?: string;
    conversationId?: string;
    payload?: Record<string, unknown>;
  }) {
    const response = await apiClient.post(API_ROUTES.EVALUATION.EVENTS, input);
    return response.data;
  },
};
