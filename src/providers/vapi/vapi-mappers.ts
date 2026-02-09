import type {
  Agent,
  Call,
  PhoneNumber,
  Tool,
  VoiceFile,
  CallStatus,
  CreateAgentParams,
  UpdateAgentParams,
  CreateCallParams,
  VoiceConfig,
  ModelConfig,
} from '../../core/types.js';

const PROVIDER = 'vapi';

// ── Voice / Model helpers ──

function mapVoiceToUnified(voice: Record<string, unknown> | undefined): VoiceConfig | undefined {
  if (!voice) return undefined;
  return {
    voiceId: (voice.voiceId as string) ?? (voice.voice as string) ?? '',
    provider: voice.provider as string | undefined,
  };
}

function mapModelToUnified(model: Record<string, unknown> | undefined): ModelConfig | undefined {
  if (!model) return undefined;
  return {
    provider: (model.provider as string) ?? '',
    model: (model.model as string) ?? '',
    systemPrompt: (model.messages as Array<{ content?: string }> | undefined)?.[0]?.content,
  };
}

// ── Assistant ↔ Agent ──

export function mapAssistantToAgent(assistant: Record<string, unknown>): Agent {
  return {
    id: assistant.id as string,
    provider: PROVIDER,
    name: assistant.name as string | undefined,
    voice: mapVoiceToUnified(assistant.voice as Record<string, unknown> | undefined),
    model: mapModelToUnified(assistant.model as Record<string, unknown> | undefined),
    firstMessage: assistant.firstMessage as string | undefined,
    metadata: assistant.metadata as Record<string, unknown> | undefined,
    raw: assistant,
  };
}

export function mapCreateAgentToVapi(
  params: CreateAgentParams,
): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (params.name !== undefined) dto.name = params.name;
  if (params.firstMessage !== undefined) dto.firstMessage = params.firstMessage;
  if (params.maxDurationSeconds !== undefined) dto.maxDurationSeconds = params.maxDurationSeconds;
  if (params.backgroundSound !== undefined) dto.backgroundSound = params.backgroundSound;
  if (params.voicemailMessage !== undefined) dto.voicemailMessage = params.voicemailMessage;
  const server: Record<string, unknown> = {};
  if (params.webhookUrl !== undefined) server.url = params.webhookUrl;
  if (params.webhookTimeoutSeconds !== undefined)
    server.timeoutSeconds = params.webhookTimeoutSeconds;
  if (Object.keys(server).length > 0) dto.server = server;
  if (params.metadata !== undefined) dto.metadata = params.metadata;
  if (params.voice) {
    dto.voice = {
      voiceId: params.voice.voiceId,
      provider: params.voice.provider ?? '11labs',
    };
  }
  if (params.model) {
    dto.model = {
      provider: params.model.provider,
      model: params.model.model,
      ...(params.model.systemPrompt
        ? { messages: [{ role: 'system', content: params.model.systemPrompt }] }
        : {}),
    };
  }
  if (params.providerOptions) {
    const { server: providerServer, ...rest } = params.providerOptions as Record<string, unknown>;
    Object.assign(dto, rest);
    if (providerServer) {
      const mergedServer = { ...(dto.server as Record<string, unknown> | undefined) };
      Object.assign(mergedServer, providerServer as Record<string, unknown>);
      dto.server = mergedServer;
    }
  }
  return dto;
}

export function mapUpdateAgentToVapi(
  id: string,
  params: UpdateAgentParams,
): Record<string, unknown> {
  const dto: Record<string, unknown> = { id };
  if (params.name !== undefined) dto.name = params.name;
  if (params.firstMessage !== undefined) dto.firstMessage = params.firstMessage;
  if (params.maxDurationSeconds !== undefined) dto.maxDurationSeconds = params.maxDurationSeconds;
  if (params.backgroundSound !== undefined) dto.backgroundSound = params.backgroundSound;
  if (params.voicemailMessage !== undefined) dto.voicemailMessage = params.voicemailMessage;
  const server: Record<string, unknown> = {};
  if (params.webhookUrl !== undefined) server.url = params.webhookUrl;
  if (params.webhookTimeoutSeconds !== undefined)
    server.timeoutSeconds = params.webhookTimeoutSeconds;
  if (Object.keys(server).length > 0) dto.server = server;
  if (params.metadata !== undefined) dto.metadata = params.metadata;
  if (params.voice) {
    dto.voice = {
      voiceId: params.voice.voiceId,
      provider: params.voice.provider ?? '11labs',
    };
  }
  if (params.model) {
    dto.model = {
      provider: params.model.provider,
      model: params.model.model,
      ...(params.model.systemPrompt
        ? { messages: [{ role: 'system', content: params.model.systemPrompt }] }
        : {}),
    };
  }
  if (params.providerOptions) {
    const { server: providerServer, ...rest } = params.providerOptions as Record<string, unknown>;
    Object.assign(dto, rest);
    if (providerServer) {
      const mergedServer = { ...(dto.server as Record<string, unknown> | undefined) };
      Object.assign(mergedServer, providerServer as Record<string, unknown>);
      dto.server = mergedServer;
    }
  }
  return dto;
}

// ── Call ──

function mapVapiCallStatus(status: string | undefined): CallStatus {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'ringing':
      return 'ringing';
    case 'in-progress':
      return 'in-progress';
    case 'ended':
      return 'ended';
    default:
      return 'unknown';
  }
}

export function mapVapiCallToCall(call: Record<string, unknown>): Call {
  const artifact = call.artifact as Record<string, unknown> | undefined;
  const customer = call.customer as Record<string, unknown> | undefined;
  const phoneNumber = call.phoneNumber as Record<string, unknown> | undefined;

  return {
    id: call.id as string,
    provider: PROVIDER,
    agentId: call.assistantId as string | undefined,
    toNumber: customer?.number as string | undefined,
    fromNumber: phoneNumber?.number as string | undefined,
    status: mapVapiCallStatus(call.status as string | undefined),
    startedAt: call.startedAt ? new Date(call.startedAt as string) : undefined,
    endedAt: call.endedAt ? new Date(call.endedAt as string) : undefined,
    duration: computeDuration(call.startedAt as string | undefined, call.endedAt as string | undefined),
    transcript: artifact?.transcript as string | undefined,
    recordingUrl: artifact?.recordingUrl as string | undefined,
    metadata: undefined,
    raw: call,
  };
}

function computeDuration(startedAt: string | undefined, endedAt: string | undefined): number | undefined {
  if (!startedAt || !endedAt) return undefined;
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

export function mapCreateCallToVapi(params: CreateCallParams): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (params.agentId) dto.assistantId = params.agentId;
  if (params.toNumber) {
    dto.customer = { number: params.toNumber };
  }
  if (params.fromNumber) dto.phoneNumberId = params.fromNumber;
  if (params.providerOptions) {
    Object.assign(dto, params.providerOptions);
  }
  return dto;
}

// ── Phone Number ──

export function mapVapiPhoneNumber(pn: Record<string, unknown>): PhoneNumber {
  return {
    id: pn.id as string,
    provider: PROVIDER,
    number: pn.number as string | undefined,
    name: pn.name as string | undefined,
    agentId: pn.assistantId as string | undefined,
    metadata: undefined,
    raw: pn,
  };
}

// ── Tool ──

export function mapVapiToolToTool(tool: Record<string, unknown>): Tool {
  const fn = tool.function as Record<string, unknown> | undefined;
  return {
    id: tool.id as string,
    provider: PROVIDER,
    type: tool.type as string,
    name: fn?.name as string | undefined,
    description: fn?.description as string | undefined,
    raw: tool,
  };
}

// ── File ──

function mapVapiFileStatus(status: string | undefined): string {
  switch (status) {
    case 'processing':
      return 'processing';
    case 'done':
      return 'done';
    case 'failed':
      return 'failed';
    default:
      return 'unknown';
  }
}

export function mapVapiFileToFile(file: Record<string, unknown>): VoiceFile {
  return {
    id: file.id as string,
    provider: PROVIDER,
    name: file.name as string | undefined,
    status: mapVapiFileStatus(file.status as string | undefined),
    bytes: file.bytes as number | undefined,
    url: file.url as string | undefined,
    mimeType: file.mimetype as string | undefined,
    metadata: file.metadata as Record<string, unknown> | undefined,
    raw: file,
  };
}
