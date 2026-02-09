// ── Unified Voice Types ──

export interface VoiceConfig {
  voiceId: string;
  provider?: string;
}

export interface ModelConfig {
  provider: string;
  model: string;
  systemPrompt?: string;
}

// ── Agent ──

export interface Agent {
  id: string;
  provider: string;
  name?: string;
  voice?: VoiceConfig;
  model?: ModelConfig;
  firstMessage?: string;
  metadata?: Record<string, unknown>;
  raw: unknown;
}

export interface CreateAgentParams {
  name?: string;
  voice?: VoiceConfig;
  model?: ModelConfig;
  firstMessage?: string;
  maxDurationSeconds?: number;
  backgroundSound?: string;
  voicemailMessage?: string;
  webhookUrl?: string;
  webhookTimeoutSeconds?: number;
  metadata?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
}

export interface UpdateAgentParams {
  name?: string;
  voice?: VoiceConfig;
  model?: ModelConfig;
  firstMessage?: string;
  maxDurationSeconds?: number;
  backgroundSound?: string;
  voicemailMessage?: string;
  webhookUrl?: string;
  webhookTimeoutSeconds?: number;
  metadata?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
}

export interface ListAgentsParams {
  limit?: number;
  cursor?: string;
}

// ── Call ──

export type CallStatus =
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'ended'
  | 'error'
  | 'unknown';

export interface Call {
  id: string;
  provider: string;
  agentId?: string;
  toNumber?: string;
  fromNumber?: string;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  transcript?: string;
  recordingUrl?: string;
  metadata?: Record<string, unknown>;
  raw: unknown;
}

export interface CreateCallParams {
  agentId?: string;
  toNumber: string;
  fromNumber?: string;
  metadata?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
}

export interface UpdateCallParams {
  metadata?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
}

export interface ListCallsParams {
  limit?: number;
  cursor?: string;
  agentId?: string;
  phoneNumberId?: string;
  callStatus?: string;
  direction?: 'inbound' | 'outbound';
  callType?: string;
  userSentiment?: string;
  callSuccessful?: boolean;
  startTime?: string;
  endTime?: string;
  metadata?: Record<string, string | number | boolean>;
  dynamicVariables?: Record<string, string | number | boolean>;
  sort?: {
    field: 'startTime' | 'createdAt';
    order: 'asc' | 'desc';
  };
  providerOptions?: Record<string, unknown>;
}

// ── Phone Number ──

export interface PhoneNumber {
  id: string;
  provider: string;
  number?: string;
  name?: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
  raw: unknown;
}

export interface ListPhoneNumbersParams {
  limit?: number;
  cursor?: string;
}

// ── Tool ──

export interface Tool {
  id: string;
  provider: string;
  type: string;
  name?: string;
  description?: string;
  raw: unknown;
}

export interface CreateToolParams {
  type: string;
  name?: string;
  description?: string;
  providerOptions?: Record<string, unknown>;
}

export interface UpdateToolParams {
  name?: string;
  description?: string;
  providerOptions?: Record<string, unknown>;
}

export interface ListToolsParams {
  limit?: number;
  cursor?: string;
}

// ── File ──

export interface VoiceFile {
  id: string;
  provider: string;
  name?: string;
  status: string;
  bytes?: number;
  url?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  raw: unknown;
}

export interface CreateFileParams {
  file: unknown;
  name?: string;
  providerOptions?: Record<string, unknown>;
}

export interface UpdateFileParams {
  name?: string;
  providerOptions?: Record<string, unknown>;
}

export interface ListFilesParams {
  limit?: number;
  cursor?: string;
}

// ── Knowledge Base ──

export interface KnowledgeBaseSource {
  id: string;
  type: string;
  url?: string;
}

export interface KnowledgeBase {
  id: string;
  provider: string;
  name: string;
  status: string;
  sources: KnowledgeBaseSource[];
  raw: unknown;
}

export interface CreateKnowledgeBaseParams {
  name: string;
  providerOptions?: Record<string, unknown>;
}

export interface ListKnowledgeBaseParams {
  limit?: number;
  cursor?: string;
}

// ── Pagination ──

export interface PaginatedList<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
