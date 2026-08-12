export type KnowledgeSourceId =
  | 'conversation_attachments'
  | 'document_kb'
  | 'documentation_kb'
  | 'application_db';

export type KnowledgeSnippet = {
  source: KnowledgeSourceId;
  title: string;
  content: string;
  score?: number;
  page?: number;
  /** Documentation hierarchy (official functional KB). */
  chapter?: string;
  section?: string;
  documentName?: string;
  /** Set by Application DB / documentation providers for observability. */
  providerId?: string;
  version?: string;
  contentHash?: string;
  ingestedAt?: string;
  /**
   * Additive structured UI payload from BQE (tables / KPIs).
   * Opaque to Knowledge Orchestrator — forwarded for finishTurn.
   */
  businessVisual?: unknown;
  /** Additive BQE transparency metadata for ExecutionTrace / chat. */
  businessTransparency?: unknown;
};

export type KnowledgeRetrieveInput = {
  userId: string;
  conversationId: string;
  query: string;
  queryEmbedding: number[];
  topK?: number;
};

export interface KnowledgeSource {
  readonly id: KnowledgeSourceId;
  retrieve(input: KnowledgeRetrieveInput): Promise<KnowledgeSnippet[]>;
}
