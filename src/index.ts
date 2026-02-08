// Core types
export type {
  Agent,
  Call,
  PhoneNumber,
  Tool,
  VoiceFile,
  KnowledgeBase,
  KnowledgeBaseSource,
  CallStatus,
  VoiceConfig,
  ModelConfig,
  CreateAgentParams,
  UpdateAgentParams,
  ListAgentsParams,
  CreateCallParams,
  UpdateCallParams,
  ListCallsParams,
  ListPhoneNumbersParams,
  CreateToolParams,
  UpdateToolParams,
  ListToolsParams,
  CreateFileParams,
  UpdateFileParams,
  ListFilesParams,
  CreateKnowledgeBaseParams,
  ListKnowledgeBaseParams,
  PaginatedList,
} from './core/types.js';

// Provider interfaces
export type {
  VoiceProvider,
  AgentManager,
  CallManager,
  PhoneNumberManager,
  ToolManager,
  FileManager,
  KnowledgeBaseManager,
} from './core/provider.js';

// Registry
export { createVoiceRegistry } from './core/registry.js';
export type { VoiceRegistry } from './core/registry.js';

// Define provider helper
export { defineProvider } from './core/define-provider.js';

// Errors
export {
  VoiceAIError,
  ProviderError,
  NotFoundError,
  AuthenticationError,
} from './core/errors.js';

// Providers
export { createVapi } from './providers/vapi/index.js';
export type { VapiConfig } from './providers/vapi/index.js';

export { createRetell } from './providers/retell/index.js';
export type { RetellConfig } from './providers/retell/index.js';
