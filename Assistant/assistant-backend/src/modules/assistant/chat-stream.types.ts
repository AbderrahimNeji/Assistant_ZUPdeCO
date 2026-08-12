/**
 * SSE event payloads for POST /assistant/chat/stream.
 * Never includes prompts, retrieved text, or chain-of-thought.
 */
export type ChatStreamTokenEvent = {
  type: 'token';
  text: string;
};

export type ChatStreamStatusEvent = {
  type: 'status';
  phase: 'started' | 'generating' | 'finalizing';
  conversationId?: string;
};

export type ChatStreamCompleteEvent = {
  type: 'complete';
  payload: Record<string, unknown>;
};

export type ChatStreamInterruptedEvent = {
  type: 'interrupted';
  payload: Record<string, unknown>;
  message?: string;
};

export type ChatStreamErrorEvent = {
  type: 'error';
  message: string;
};

export type ChatStreamEvent =
  | ChatStreamTokenEvent
  | ChatStreamStatusEvent
  | ChatStreamCompleteEvent
  | ChatStreamInterruptedEvent
  | ChatStreamErrorEvent;

export type ChatStreamOptions = {
  signal?: AbortSignal;
  onToken?: (text: string) => void;
  onStatus?: (
    phase: ChatStreamStatusEvent['phase'],
    conversationId?: string,
  ) => void;
};
