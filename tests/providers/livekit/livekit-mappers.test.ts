import {
  mapDispatchRuleToAgent,
  mapCreateAgentToLiveKit,
  mapUpdateAgentToLiveKit,
  mapRoomToCall,
  mapSipParticipantToCall,
  mapLiveKitPhoneNumber,
  mapCreatePhoneNumberToLiveKit,
} from '../../../src/providers/livekit/livekit-mappers';

const sampleRule = {
  sipDispatchRuleId: 'rule_1',
  name: 'Sales Agent',
  metadata: JSON.stringify({ tier: 'pro' }),
  attributes: {
    agentVoiceId: 'rachel',
    agentVoiceProvider: '11labs',
    agentModel: 'gpt-4',
    agentModelProvider: 'openai',
    agentSystemPrompt: 'You are a sales agent.',
    agentFirstMessage: 'Hello!',
  },
  trunkIds: [],
  hidePhoneNumber: false,
  inboundNumbers: [],
  numbers: [],
  roomPreset: '',
  krispEnabled: false,
  mediaEncryption: 0,
};

describe('mapDispatchRuleToAgent', () => {
  it('maps all fields correctly', () => {
    const agent = mapDispatchRuleToAgent(sampleRule as never);
    expect(agent.id).toBe('rule_1');
    expect(agent.provider).toBe('livekit');
    expect(agent.name).toBe('Sales Agent');
    expect(agent.voice).toEqual({ voiceId: 'rachel', provider: '11labs' });
    expect(agent.model).toEqual({
      provider: 'openai',
      model: 'gpt-4',
      systemPrompt: 'You are a sales agent.',
    });
    expect(agent.firstMessage).toBe('Hello!');
    expect(agent.metadata).toEqual({ tier: 'pro' });
    expect(agent.raw).toBe(sampleRule);
  });

  it('returns undefined voice/model when attributes are absent', () => {
    const agent = mapDispatchRuleToAgent({ ...sampleRule, attributes: {} } as never);
    expect(agent.voice).toBeUndefined();
    expect(agent.model).toBeUndefined();
    expect(agent.firstMessage).toBeUndefined();
  });

  it('defaults model provider to openai when missing', () => {
    const attrs = { agentModel: 'gpt-4' };
    const agent = mapDispatchRuleToAgent({ ...sampleRule, attributes: attrs } as never);
    expect(agent.model?.provider).toBe('openai');
  });

  it('handles non-JSON metadata gracefully', () => {
    const agent = mapDispatchRuleToAgent({ ...sampleRule, metadata: 'not-json' } as never);
    expect(agent.metadata).toBeUndefined();
  });

  it('handles empty metadata', () => {
    const agent = mapDispatchRuleToAgent({ ...sampleRule, metadata: '' } as never);
    expect(agent.metadata).toBeUndefined();
  });
});

describe('mapCreateAgentToLiveKit', () => {
  it('maps full params to rule + opts', () => {
    const { rule, opts } = mapCreateAgentToLiveKit({
      name: 'My Agent',
      voice: { voiceId: 'rachel', provider: '11labs' },
      model: { provider: 'openai', model: 'gpt-4', systemPrompt: 'Hi' },
      firstMessage: 'Hello!',
      metadata: { key: 'val' },
      providerOptions: { roomName: 'my-room', trunkIds: ['trunk_1'] },
    });
    expect(rule.type).toBe('direct');
    expect(rule.roomName).toBe('my-room');
    expect(opts.name).toBe('My Agent');
    expect(opts.metadata).toBe(JSON.stringify({ key: 'val' }));
    expect(opts.attributes?.['agentVoiceId']).toBe('rachel');
    expect(opts.attributes?.['agentVoiceProvider']).toBe('11labs');
    expect(opts.attributes?.['agentModel']).toBe('gpt-4');
    expect(opts.attributes?.['agentModelProvider']).toBe('openai');
    expect(opts.attributes?.['agentSystemPrompt']).toBe('Hi');
    expect(opts.attributes?.['agentFirstMessage']).toBe('Hello!');
    expect(opts.trunkIds).toEqual(['trunk_1']);
  });

  it('maps individual rule params when requested', () => {
    const { rule, opts } = mapCreateAgentToLiveKit({
      name: 'My Agent',
      providerOptions: { ruleType: 'individual', roomPrefix: 'support-' },
    });
    expect(rule.type).toBe('individual');
    expect('roomPrefix' in rule && rule.roomPrefix).toBe('support-');
    expect(opts.name).toBe('My Agent');
  });

  it('defaults individual roomPrefix when not provided', () => {
    const { rule } = mapCreateAgentToLiveKit({
      name: 'My Agent',
      providerOptions: { ruleType: 'individual' },
    });
    expect(rule.type).toBe('individual');
    expect('roomPrefix' in rule && rule.roomPrefix).toBe('agent-');
  });

  it('uses empty roomName when not provided', () => {
    const { rule } = mapCreateAgentToLiveKit({ name: 'x' });
    expect(rule.type).toBe('direct');
    expect(rule.roomName).toBe('');
  });

  it('merges extra attributes from providerOptions', () => {
    const { opts } = mapCreateAgentToLiveKit({
      name: 'x',
      providerOptions: { attributes: { custom: 'value' } },
    });
    expect(opts.attributes?.['custom']).toBe('value');
  });
});

describe('mapUpdateAgentToLiveKit', () => {
  it('maps update params to SipDispatchRuleUpdateOptions', () => {
    const result = mapUpdateAgentToLiveKit({
      name: 'Updated',
      voice: { voiceId: 'josh', provider: 'azure' },
      model: { provider: 'anthropic', model: 'claude-3' },
      metadata: { updated: true },
    });
    expect(result.name).toBe('Updated');
    expect(result.metadata).toBe(JSON.stringify({ updated: true }));
    expect(result.attributes?.['agentVoiceId']).toBe('josh');
    expect(result.attributes?.['agentModelProvider']).toBe('anthropic');
  });

  it('returns undefined attributes when no voice/model params', () => {
    const result = mapUpdateAgentToLiveKit({ name: 'x' });
    expect(result.attributes).toBeUndefined();
  });
});

describe('mapRoomToCall', () => {
  it('maps a room to a call', () => {
    const room = {
      name: 'room-abc',
      creationTimeMs: BigInt(1700000000000),
      creationTime: BigInt(0),
      metadata: JSON.stringify({ callId: '123' }),
    };
    const call = mapRoomToCall(room as never);
    expect(call.id).toBe('room-abc');
    expect(call.provider).toBe('livekit');
    expect(call.status).toBe('in-progress');
    expect(call.startedAt).toEqual(new Date(1700000000000));
    expect(call.metadata).toEqual({ callId: '123' });
    expect(call.transcript).toBeUndefined();
    expect(call.recordingUrl).toBeUndefined();
  });

  it('falls back to creationTime (seconds) when creationTimeMs is 0', () => {
    const room = {
      name: 'room-x',
      creationTimeMs: BigInt(0),
      creationTime: BigInt(1700000000),
    };
    const call = mapRoomToCall(room as never);
    expect(call.startedAt).toEqual(new Date(1700000000000));
  });

  it('handles missing timestamp', () => {
    const room = { name: 'r', creationTimeMs: BigInt(0), creationTime: BigInt(0) };
    const call = mapRoomToCall(room as never);
    expect(call.startedAt).toBeUndefined();
  });
});

describe('mapSipParticipantToCall', () => {
  it('maps SIP participant info to a call', () => {
    const participant = {
      participantId: 'p1',
      participantIdentity: 'sip_+14155551234',
      roomName: 'outbound-room',
      sipCallId: 'sip_call_1',
    };
    const call = mapSipParticipantToCall(participant as never);
    expect(call.id).toBe('outbound-room');
    expect(call.provider).toBe('livekit');
    expect(call.status).toBe('in-progress');
    expect(call.raw).toBe(participant);
  });
});

describe('mapLiveKitPhoneNumber', () => {
  it('maps camelCase response fields', () => {
    const pn = {
      id: 'pn_1',
      e164Format: '+14155551234',
      sipDispatchRuleId: 'rule_1',
      areaCode: '415',
    };
    const result = mapLiveKitPhoneNumber(pn);
    expect(result.id).toBe('pn_1');
    expect(result.provider).toBe('livekit');
    expect(result.number).toBe('+14155551234');
    expect(result.agentId).toBe('rule_1');
    expect(result.inboundAgentId).toBe('rule_1');
    expect(result.outboundAgentId).toBeUndefined();
    expect(result.areaCode).toBe('415');
  });

  it('maps snake_case response fields', () => {
    const pn = {
      id: 'pn_2',
      e164_format: '+12125550100',
      sip_dispatch_rule_id: 'rule_2',
      area_code: '212',
    };
    const result = mapLiveKitPhoneNumber(pn);
    expect(result.number).toBe('+12125550100');
    expect(result.agentId).toBe('rule_2');
    expect(result.areaCode).toBe('212');
  });
});

describe('mapCreatePhoneNumberToLiveKit', () => {
  it('maps areaCode and inboundAgentId', () => {
    const dto = mapCreatePhoneNumberToLiveKit({
      areaCode: '415',
      inboundAgentId: 'rule_1',
    });
    expect(dto['area_code']).toBe('415');
    expect(dto['sip_dispatch_rule_id']).toBe('rule_1');
  });

  it('omits sip_dispatch_rule_id when no inboundAgentId', () => {
    const dto = mapCreatePhoneNumberToLiveKit({ areaCode: '212' });
    expect(dto['sip_dispatch_rule_id']).toBeUndefined();
    expect(dto['area_code']).toBe('212');
  });
});
