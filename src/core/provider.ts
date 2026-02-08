import type {
  Agent,
  Call,
  PhoneNumber,
  Tool,
  VoiceFile,
  KnowledgeBase,
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
} from './types.js';

export interface AgentManager {
  create(params: CreateAgentParams): Promise<Agent>;
  list(params?: ListAgentsParams): Promise<PaginatedList<Agent>>;
  get(id: string): Promise<Agent>;
  update(id: string, params: UpdateAgentParams): Promise<Agent>;
  delete(id: string): Promise<void>;
}

export interface CallManager {
  create(params: CreateCallParams): Promise<Call>;
  list(params?: ListCallsParams): Promise<PaginatedList<Call>>;
  get(id: string): Promise<Call>;
  update(id: string, params: UpdateCallParams): Promise<Call>;
  delete(id: string): Promise<void>;
}

export interface PhoneNumberManager {
  list(params?: ListPhoneNumbersParams): Promise<PaginatedList<PhoneNumber>>;
  get(id: string): Promise<PhoneNumber>;
}

export interface ToolManager {
  create(params: CreateToolParams): Promise<Tool>;
  list(params?: ListToolsParams): Promise<PaginatedList<Tool>>;
  get(id: string): Promise<Tool>;
  update(id: string, params: UpdateToolParams): Promise<Tool>;
  delete(id: string): Promise<void>;
}

export interface FileManager {
  create(params: CreateFileParams): Promise<VoiceFile>;
  list(params?: ListFilesParams): Promise<PaginatedList<VoiceFile>>;
  get(id: string): Promise<VoiceFile>;
  update(id: string, params: UpdateFileParams): Promise<VoiceFile>;
  delete(id: string): Promise<void>;
}

export interface KnowledgeBaseManager {
  create(params: CreateKnowledgeBaseParams): Promise<KnowledgeBase>;
  list(params?: ListKnowledgeBaseParams): Promise<PaginatedList<KnowledgeBase>>;
  get(id: string): Promise<KnowledgeBase>;
  delete(id: string): Promise<void>;
}

export interface VoiceProvider {
  readonly providerId: string;
  readonly agents: AgentManager;
  readonly calls: CallManager;
  readonly phoneNumbers: PhoneNumberManager;
  readonly tools?: ToolManager;
  readonly files?: FileManager;
  readonly knowledgeBase?: KnowledgeBaseManager;
}
