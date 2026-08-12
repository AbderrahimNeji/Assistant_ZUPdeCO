export type SuggestedActionType =
  | 'follow_up_question'
  | 'tool_action'
  | 'navigation'
  | 'download'
  | 'external_link';

/**
 * Proactive next-step suggestion (no prompts / retrieved text).
 */
export type SuggestedAction = {
  id: string;
  label: string;
  type: SuggestedActionType;
  payload: Record<string, unknown>;
};

export type SuggestionContext = {
  question: string;
  answer: string;
  plannerMode?: string;
  plannerTools?: string[];
  knowledgeProviders?: string[];
  conversationAttachmentCount?: number;
  documentKbCount?: number;
  executedToolIds?: string[];
  toolStatus?: string;
  sourceTitles?: string[];
  previousSuggestionIds?: string[];
  /** Optional page-aware hints from ApplicationContext (additive). */
  pageRoute?: string;
  pageInterfaceId?: string;
  pageTitle?: string;
  selectionType?: string;
  selectionLabel?: string;
  focusedEntityKinds?: string[];
};

export interface SuggestionContributor {
  readonly id: string;
  contribute(context: SuggestionContext): SuggestedAction[];
}

export const MAX_SUGGESTED_ACTIONS = 4;
