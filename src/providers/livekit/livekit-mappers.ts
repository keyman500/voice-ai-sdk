import type { SIPDispatchRuleInfo, SIPParticipantInfo, Room } from '@livekit/protocol';
import type { CreateSipDispatchRuleOptions, SipDispatchRuleDirect, SipDispatchRuleUpdateOptions } from 'livekit-server-sdk';
import type { Agent, Call, PhoneNumber, CreateAgentParams, UpdateAgentParams, CreatePhoneNumberParams } from '../../core/types.js';

export function mapDispatchRuleToAgent(rule: SIPDispatchRuleInfo): Agent {
  const attrs = rule.attributes ?? {};
  let metadata: Record<string, unknown> | undefined;
  if (rule.metadata) {
    try { metadata = JSON.parse(rule.metadata); } catch { /* non-JSON metadata */ }
  }
  return {
    id: rule.sipDispatchRuleId,
    provider: 'livekit',
    name: rule.name,
    voice: attrs['agentVoiceId']
      ? { voiceId: attrs['agentVoiceId'], provider: attrs['agentVoiceProvider'] }
      : undefined,
    model: attrs['agentModel']
      ? {
          provider: attrs['agentModelProvider'] ?? 'openai',
          model: attrs['agentModel'],
          systemPrompt: attrs['agentSystemPrompt'],
        }
      : undefined,
    firstMessage: attrs['agentFirstMessage'] ?? undefined,
    metadata,
    raw: rule,
  };
}

export function mapCreateAgentToLiveKit(
  params: CreateAgentParams,
): { rule: SipDispatchRuleDirect; opts: CreateSipDispatchRuleOptions } {
  const attributes: Record<string, string> = {};
  if (params.voice?.voiceId) attributes['agentVoiceId'] = params.voice.voiceId;
  if (params.voice?.provider) attributes['agentVoiceProvider'] = params.voice.provider;
  if (params.model?.model) attributes['agentModel'] = params.model.model;
  if (params.model?.provider) attributes['agentModelProvider'] = params.model.provider;
  if (params.model?.systemPrompt) attributes['agentSystemPrompt'] = params.model.systemPrompt;
  if (params.firstMessage) attributes['agentFirstMessage'] = params.firstMessage;

  // Merge any extra attributes from providerOptions
  const providerAttrs = (params.providerOptions?.attributes as Record<string, string> | undefined) ?? {};
  Object.assign(attributes, providerAttrs);

  const roomName: string = (params.providerOptions?.roomName as string | undefined) ?? '';

  return {
    rule: { type: 'direct', roomName },
    opts: {
      name: params.name,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      attributes,
      trunkIds: params.providerOptions?.trunkIds as string[] | undefined,
    },
  };
}

export function mapUpdateAgentToLiveKit(params: UpdateAgentParams): SipDispatchRuleUpdateOptions {
  const attributes: Record<string, string> | undefined = (() => {
    const a: Record<string, string> = {};
    if (params.voice?.voiceId) a['agentVoiceId'] = params.voice.voiceId;
    if (params.voice?.provider) a['agentVoiceProvider'] = params.voice.provider;
    if (params.model?.model) a['agentModel'] = params.model.model;
    if (params.model?.provider) a['agentModelProvider'] = params.model.provider;
    if (params.model?.systemPrompt) a['agentSystemPrompt'] = params.model.systemPrompt;
    if (params.firstMessage) a['agentFirstMessage'] = params.firstMessage;
    const extra = (params.providerOptions?.attributes as Record<string, string> | undefined) ?? {};
    Object.assign(a, extra);
    return Object.keys(a).length > 0 ? a : undefined;
  })();

  return {
    name: params.name,
    metadata: params.metadata !== undefined ? JSON.stringify(params.metadata) : undefined,
    attributes,
  };
}

export function mapRoomToCall(room: Room): Call {
  const createdMs = room.creationTimeMs
    ? Number(room.creationTimeMs)
    : room.creationTime
      ? Number(room.creationTime) * 1000
      : undefined;

  let metadata: Record<string, unknown> | undefined;
  if (room.metadata) {
    try { metadata = JSON.parse(room.metadata); } catch { /* non-JSON */ }
  }

  return {
    id: room.name,
    provider: 'livekit',
    agentId: undefined,
    toNumber: undefined,
    fromNumber: undefined,
    status: 'in-progress',
    startedAt: createdMs ? new Date(createdMs) : undefined,
    endedAt: undefined,
    duration: undefined,
    transcript: undefined,
    recordingUrl: undefined,
    metadata,
    raw: room,
  };
}

export function mapSipParticipantToCall(participant: SIPParticipantInfo): Call {
  return {
    id: participant.roomName,
    provider: 'livekit',
    agentId: undefined,
    toNumber: undefined,
    fromNumber: undefined,
    status: 'in-progress',
    startedAt: new Date(),
    endedAt: undefined,
    duration: undefined,
    transcript: undefined,
    recordingUrl: undefined,
    metadata: undefined,
    raw: participant,
  };
}

export function mapLiveKitPhoneNumber(pn: Record<string, unknown>): PhoneNumber {
  return {
    id: pn['id'] as string,
    provider: 'livekit',
    number: (pn['e164Format'] ?? pn['e164_format']) as string,
    name: undefined,
    agentId: (pn['sipDispatchRuleId'] ?? pn['sip_dispatch_rule_id']) as string | undefined,
    inboundAgentId: (pn['sipDispatchRuleId'] ?? pn['sip_dispatch_rule_id']) as string | undefined,
    outboundAgentId: undefined,
    webhookUrl: undefined,
    areaCode: (pn['areaCode'] ?? pn['area_code']) as string | undefined,
    metadata: undefined,
    raw: pn,
  };
}

export function mapCreatePhoneNumberToLiveKit(params: CreatePhoneNumberParams): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (params.areaCode) dto['area_code'] = params.areaCode;
  if (params.inboundAgentId) dto['sip_dispatch_rule_id'] = params.inboundAgentId;
  if (params.providerOptions) Object.assign(dto, params.providerOptions);
  return dto;
}
