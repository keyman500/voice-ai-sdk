import type {
  Agent,
  Call,
  PhoneNumber,
  KnowledgeBase,
  KnowledgeBaseSource,
  CallStatus,
  CreateAgentParams,
  UpdateAgentParams,
  CreateCallParams,
  ModelConfig,
} from '../../core/types.js';

const PROVIDER = 'retell';

// ── Agent ──

function mapModelFromRetell(
  responseEngine: Record<string, unknown> | undefined,
): ModelConfig | undefined {
  if (!responseEngine) return undefined;
  const type = responseEngine.type as string;
  if (type === 'retell-llm') {
    return {
      provider: 'retell-llm',
      model: (responseEngine.llm_id as string) ?? '',
    };
  }
  if (type === 'custom-llm') {
    return {
      provider: 'custom-llm',
      model: (responseEngine.llm_websocket_url as string) ?? '',
    };
  }
  return undefined;
}

export function mapRetellAgentToAgent(agent: Record<string, unknown>): Agent {
  return {
    id: agent.agent_id as string,
    provider: PROVIDER,
    name: agent.agent_name as string | undefined,
    voice: agent.voice_id
      ? { voiceId: agent.voice_id as string }
      : undefined,
    model: mapModelFromRetell(agent.response_engine as Record<string, unknown> | undefined),
    firstMessage: agent.begin_message as string | undefined,
    metadata: undefined,
    raw: agent,
  };
}

export function mapCreateAgentToRetell(
  params: CreateAgentParams,
): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (params.name !== undefined) dto.agent_name = params.name;
  if (params.voice) dto.voice_id = params.voice.voiceId;
  if (params.firstMessage !== undefined) dto.begin_message = params.firstMessage;
  if (params.model) {
    dto.response_engine = {
      type: params.model.provider,
      llm_id: params.model.model,
    };
  }
  if (params.providerOptions) {
    Object.assign(dto, params.providerOptions);
  }
  return dto;
}

export function mapUpdateAgentToRetell(
  params: UpdateAgentParams,
): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (params.name !== undefined) dto.agent_name = params.name;
  if (params.voice) dto.voice_id = params.voice.voiceId;
  if (params.firstMessage !== undefined) dto.begin_message = params.firstMessage;
  if (params.model) {
    dto.response_engine = {
      type: params.model.provider,
      llm_id: params.model.model,
    };
  }
  if (params.providerOptions) {
    Object.assign(dto, params.providerOptions);
  }
  return dto;
}

// ── Call ──

function mapRetellCallStatus(status: string | undefined): CallStatus {
  switch (status) {
    case 'registered':
      return 'queued';
    case 'ongoing':
      return 'in-progress';
    case 'ended':
      return 'ended';
    case 'error':
      return 'error';
    case 'not_connected':
      return 'unknown';
    default:
      return 'unknown';
  }
}

export function mapRetellCallToCall(call: Record<string, unknown>): Call {
  const startMs = call.start_timestamp as number | undefined;
  const endMs = call.end_timestamp as number | undefined;

  return {
    id: call.call_id as string,
    provider: PROVIDER,
    agentId: call.agent_id as string | undefined,
    toNumber: call.to_number as string | undefined,
    fromNumber: call.from_number as string | undefined,
    status: mapRetellCallStatus(call.call_status as string | undefined),
    startedAt: startMs ? new Date(startMs) : undefined,
    endedAt: endMs ? new Date(endMs) : undefined,
    duration: call.duration_ms != null
      ? Math.round((call.duration_ms as number) / 1000)
      : undefined,
    transcript: call.transcript as string | undefined,
    recordingUrl: call.recording_url as string | undefined,
    metadata: call.metadata as Record<string, unknown> | undefined,
    raw: call,
  };
}

export function mapCreateCallToRetell(params: CreateCallParams): Record<string, unknown> {
  const dto: Record<string, unknown> = {
    to_number: params.toNumber,
  };
  if (params.fromNumber) dto.from_number = params.fromNumber;
  if (params.agentId) dto.agent_id = params.agentId;
  if (params.metadata) dto.metadata = params.metadata;
  if (params.providerOptions) {
    Object.assign(dto, params.providerOptions);
  }
  return dto;
}

// ── Phone Number ──

export function mapRetellPhoneNumber(pn: Record<string, unknown>): PhoneNumber {
  return {
    id: pn.phone_number as string,
    provider: PROVIDER,
    number: pn.phone_number as string | undefined,
    name: pn.nickname as string | undefined,
    agentId: pn.inbound_agent_id as string | undefined,
    metadata: undefined,
    raw: pn,
  };
}

// ── Knowledge Base ──

function mapKnowledgeBaseSource(source: Record<string, unknown>): KnowledgeBaseSource {
  return {
    id: source.source_id as string,
    type: source.type as string,
    url: (source.url ?? source.file_url ?? source.content_url) as string | undefined,
  };
}

export function mapRetellKnowledgeBase(kb: Record<string, unknown>): KnowledgeBase {
  const sources = kb.knowledge_base_sources as Record<string, unknown>[] | undefined;
  return {
    id: kb.knowledge_base_id as string,
    provider: PROVIDER,
    name: kb.knowledge_base_name as string,
    status: kb.status as string,
    sources: sources ? sources.map(mapKnowledgeBaseSource) : [],
    raw: kb,
  };
}
