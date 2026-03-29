// Core types
export type {
  Agent,
  Call,
  Campaign,
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
  CreateCampaignParams,
  UpdateCallParams,
  UpdateCampaignParams,
  ListCallsParams,
  ListCampaignsParams,
  ListPhoneNumbersParams,
  CreatePhoneNumberParams,
  UpdatePhoneNumberParams,
  CreateToolParams,
  UpdateToolParams,
  ListToolsParams,
  CreateFileParams,
  UpdateFileParams,
  ListFilesParams,
  CreateKnowledgeBaseParams,
  ListKnowledgeBaseParams,
  AddKnowledgeBaseSourcesParams,
  CampaignTask,
  CampaignStatus,
  PaginatedList,
} from './core/types.js';

// Provider interfaces
export type {
  VoiceProvider,
  AgentManager,
  CallManager,
  CampaignManager,
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
export { RetellCampaignManager } from './providers/retell/retell-campaign-manager.js';
export { RetellKnowledgeBaseManager } from './providers/retell/retell-knowledge-base-manager.js';
