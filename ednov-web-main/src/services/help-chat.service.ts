import { apiClient } from './api-client';

/** Turn as stored in the UI (may include metadata not sent to the API). */
export interface HelpChatTurn {
  role: 'user' | 'assistant';
  content: string;
  /** Titles of retrieved doc sections for this reply (assistant only). */
  relatedSections?: string[];
}

export interface HelpChatApiTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface HelpChatResponse {
  reply: string;
  relatedSections?: string[];
}

/** Strip UI-only fields before POST /ai/help-chat. */
export function helpChatTurnsForApi(turns: HelpChatTurn[]): HelpChatApiTurn[] {
  return turns.map(({ role, content }) => ({ role, content }));
}

export async function postHelpChat(payload: {
  message: string;
  messages?: HelpChatApiTurn[];
}): Promise<HelpChatResponse> {
  const { data } = await apiClient.post<HelpChatResponse>('/ai/help-chat', payload);
  return {
    reply: data.reply,
    relatedSections: Array.isArray(data.relatedSections) ? data.relatedSections : [],
  };
}
